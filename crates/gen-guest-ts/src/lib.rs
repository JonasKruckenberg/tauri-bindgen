#![allow(
    clippy::must_use_candidate,
    clippy::missing_panics_doc,
    clippy::missing_errors_doc,
    clippy::unused_self
)]

use heck::{ToKebabCase, ToLowerCamelCase, ToSnakeCase, ToUpperCamelCase};
use std::path::PathBuf;
use tauri_bindgen_core::{postprocess, Generate, GeneratorBuilder, TypeInfo, TypeInfos};
use tauri_bindgen_gen_js::{JavaScriptGenerator, SerdeUtils};
use wit_parser::{
    EnumCase, FlagsField, Function, FunctionResult, Interface, RecordField, Type, TypeDefId,
    TypeDefKind, UnionCase, VariantCase,
};

#[derive(Debug, Clone, Default)]
#[cfg_attr(feature = "clap", derive(clap::Args))]
#[cfg_attr(feature = "clap", clap(group(
    clap::ArgGroup::new("fmt")
        .args(&["prettier", "romefmt"]),
)))]
pub struct Builder {
    /// Run `prettier` to format the generated code. This requires a global installation of `prettier`.
    #[cfg_attr(feature = "clap", clap(long))]
    pub prettier: bool,
    /// Run `rome format` to format the generated code. This formatter is much faster that `prettier`. Requires a global installation of `prettier`.
    #[cfg_attr(feature = "clap", clap(long))]
    pub romefmt: bool,
}

impl GeneratorBuilder for Builder {
    fn build(self, interface: Interface) -> Box<dyn Generate> {
        let infos = TypeInfos::collect_from_functions(&interface.typedefs, &interface.functions);

        let serde_utils =
            SerdeUtils::collect_from_functions(&interface.typedefs, &interface.functions);

        Box::new(TypeScript {
            opts: self,
            interface,
            infos,
            serde_utils,
        })
    }
}

#[derive(Debug)]
pub struct TypeScript {
    opts: Builder,
    interface: Interface,
    infos: TypeInfos,
    serde_utils: SerdeUtils,
}

impl TypeScript {
    pub fn print_function(&self, intf_name: &str, func: &Function) -> String {
        let docs = print_docs(&func.docs);

        let ident = func.ident.to_lower_camel_case();
        let name = func.ident.to_snake_case();

        let params = self.print_function_params(&func.params);

        let param_idents = func
            .params
            .iter()
            .map(|(ident, _)| ident.to_lower_camel_case())
            .collect::<Vec<_>>()
            .join(", ");

        let result = func
            .result
            .as_ref()
            .map(|result| self.print_function_result(result))
            .unwrap_or_default();

        let deserialize_result = func
            .result
            .as_ref()
            .map(|res| self.print_deserialize_function_result(res))
            .unwrap_or_default();

        format!(
            r#"
            {docs}
            export async function {ident} ({params}) {result} {{
                return fetch('ipc://localhost/{intf_name}/{name}', {{ method: "POST", body: JSON.stringify([{param_idents}]) }}){deserialize_result}
            }}
        "#
        )
    }

    fn print_function_params(&self, params: &[(String, Type)]) -> String {
        params
            .iter()
            .map(|(ident, ty)| {
                let ident = ident.to_lower_camel_case();
                let ty = self.print_type(ty);

                format!("{ident}: {ty}")
            })
            .collect::<Vec<_>>()
            .join(", ")
    }

    fn print_function_result(&self, result: &FunctionResult) -> String {
        match result.len() {
            0 => String::new(),
            1 => {
                let ty = self.print_type(result.types().next().unwrap());
                format!(": Promise<{ty}>")
            }
            _ => {
                let tys = result
                    .types()
                    .map(|ty| self.print_type(ty))
                    .collect::<Vec<_>>()
                    .join(", ");
                format!(": Promise<[{tys}]>")
            }
        }
    }

    fn print_type(&self, ty: &Type) -> String {
        match ty {
            Type::Bool => "boolean".to_string(),
            Type::U8
            | Type::U16
            | Type::U32
            | Type::S8
            | Type::S16
            | Type::S32
            | Type::Float32
            | Type::Float64 => "number".to_string(),
            Type::U64 | Type::S64 => "bigint".to_string(),
            Type::Char | Type::String => "string".to_string(),
            Type::Tuple(types) => {
                let types = types
                    .iter()
                    .map(|ty| self.print_type(ty))
                    .collect::<Vec<_>>()
                    .join(", ");

                format!("[{types}]")
            }
            Type::List(ty) => {
                let ty = self.array_ty(ty).unwrap_or(self.print_type(ty));
                format!("{ty}[]")
            }
            Type::Option(ty) => {
                let ty = self.print_type(ty);

                format!("{ty} | null")
            }
            Type::Result { ok, err } => {
                let ok = ok
                    .as_ref()
                    .map_or("_".to_string(), |ty| self.print_type(ty));
                let err = err
                    .as_ref()
                    .map_or("_".to_string(), |ty| self.print_type(ty));

                format!("Result<{ok}, {err}>")
            }
            Type::Id(id) => self.interface.typedefs[*id].ident.to_upper_camel_case(),
        }
    }

    fn print_typedef(&self, id: TypeDefId) -> String {
        let typedef = &self.interface.typedefs[id];
        let ident = &typedef.ident.to_upper_camel_case();
        let docs = print_docs(&typedef.docs);

        match &typedef.kind {
            TypeDefKind::Alias(ty) => self.print_alias(&docs, ident, ty),
            TypeDefKind::Record(fields) => self.print_record(&docs, ident, fields),
            TypeDefKind::Flags(fields) => self.print_flags(&docs, ident, fields),
            TypeDefKind::Variant(cases) => self.print_variant(&docs, ident, cases),
            TypeDefKind::Enum(cases) => self.print_enum(&docs, ident, cases),
            TypeDefKind::Union(cases) => self.print_union(&docs, ident, cases),
            TypeDefKind::Resource(functions) => self.print_resource(&docs, ident, functions),
        }
    }

    fn print_alias(&self, docs: &str, ident: &str, ty: &Type) -> String {
        let ty = self.print_type(ty);

        format!("{docs}\nexport type {ident} = {ty};\n")
    }

    fn print_record(&self, docs: &str, ident: &str, fields: &[RecordField]) -> String {
        let fields: String = fields
            .iter()
            .map(|field| {
                let docs = print_docs(&field.docs);
                let ident = field.ident.to_lower_camel_case();
                let ty = self.print_type(&field.ty);

                format!("{docs}\n{ident}: {ty},\n")
            })
            .collect();

        format!("{docs}\nexport interface {ident} {{ {fields} }}\n")
    }

    fn print_flags(&self, docs: &str, ident: &str, fields: &[FlagsField]) -> String {
        let fields: String = fields
            .iter()
            .enumerate()
            .map(|(i, field)| {
                let docs = print_docs(&field.docs);
                let ident = field.ident.to_upper_camel_case();
                let value: u64 = 2 << i;

                format!("{docs}\n{ident} = {value},\n")
            })
            .collect();

        format!("{docs}\nexport enum {ident} {{ {fields} }}\n")
    }

    fn print_variant(&self, docs: &str, ident: &str, cases: &[VariantCase]) -> String {
        let interfaces: String = cases
            .iter()
            .enumerate()
            .map(|(i, case)| {
                let docs = print_docs(&case.docs);
                let case_ident = case.ident.to_upper_camel_case();
                let value = case
                    .ty
                    .as_ref()
                    .map(|ty| {
                        let ty = self.print_type(ty);
                        format!(", value: {ty}")
                    })
                    .unwrap_or_default();

                format!("{docs}\nexport interface {ident}{case_ident} {{ tag: {i}{value} }}\n")
            })
            .collect();

        let cases: String = cases
            .iter()
            .map(|case| {
                let docs = print_docs(&case.docs);
                let case_ident = case.ident.to_upper_camel_case();

                format!("{docs}\n{ident}{case_ident}")
            })
            .collect::<Vec<_>>()
            .join(" | ");

        format!("{interfaces}\n{docs}\nexport type {ident} = {cases}\n")
    }

    fn print_enum(&self, docs: &str, ident: &str, cases: &[EnumCase]) -> String {
        let cases: String = cases
            .iter()
            .map(|case| {
                let docs = print_docs(&case.docs);
                let ident = case.ident.to_upper_camel_case();

                format!("{docs}\n{ident},\n")
            })
            .collect();

        format!("{docs}\nexport enum {ident} {{ {cases} }}\n")
    }

    fn print_union(&self, docs: &str, ident: &str, cases: &[UnionCase]) -> String {
        let cases: String = cases
            .iter()
            .map(|case| {
                let docs = print_docs(&case.docs);
                let ty = self.print_type(&case.ty);

                format!("{docs}\n{ty}\n")
            })
            .collect::<Vec<_>>()
            .join(" | ");

        format!("{docs}\nexport type {ident} = {cases};\n")
    }

    fn print_resource(&self, docs: &str, ident: &str, functions: &[Function]) -> String {
        let functions: String = functions
            .iter()
            .map(|func| {
                let docs = print_docs(&func.docs);

                let ident = func.ident.to_lower_camel_case();

                let params = self.print_function_params(&func.params);
                let result = func
                    .result
                    .as_ref()
                    .map(|result| self.print_function_result(result))
                    .unwrap_or_default();

                format!(
                    r#"
                        {docs}
                        async {ident} ({params}) {result} {{
                        }}
                    "#
                )
            })
            .collect();

        format!(
            "{docs}\nclass {ident} {{
                    #id: number;

                    {functions}
                }}"
        )
    }

    fn array_ty(&self, ty: &Type) -> Option<String> {
        match ty {
            Type::U8 => Some("Uint8Array".to_string()),
            Type::S8 => Some("Int8Array".to_string()),
            Type::U16 => Some("Uint16Array".to_string()),
            Type::S16 => Some("Int16Array".to_string()),
            Type::U32 => Some("Uint32Array".to_string()),
            Type::S32 => Some("Int32Array".to_string()),
            Type::U64 => Some("BigUint64Array".to_string()),
            Type::S64 => Some("BigInt64Array".to_string()),
            Type::Float32 => Some("Float32Array".to_string()),
            Type::Float64 => Some("Float64Array".to_string()),
            Type::Id(id) => match &self.interface.typedefs[*id].kind {
                TypeDefKind::Alias(t) => self.array_ty(t),
                _ => None,
            },
            Type::Bool
            | Type::Tuple(_)
            | Type::List(_)
            | Type::Option(_)
            | Type::Result { .. }
            | Type::Char
            | Type::String => None,
        }
    }
}

fn print_docs(docs: &str) -> String {
    if docs.is_empty() {
        return String::new();
    }

    let docs = docs
        .lines()
        .map(|line| format!(" * {line} \n"))
        .collect::<String>();

    format!("/**\n{docs}*/")
}

impl JavaScriptGenerator for TypeScript {
    fn interface(&self) -> &Interface {
        &self.interface
    }

    fn infos(&self) -> &TypeInfos {
        &self.infos
    }
}

impl Generate for TypeScript {
    fn to_file(&mut self) -> (std::path::PathBuf, String) {
        let result_ty = self
            .interface
            .functions
            .iter()
            .any(Function::throws)
            .then_some(
                "export type Result<T, E> = { tag: 'ok', val: T } | { tag: 'err', val: E };\n",
            )
            .unwrap_or_default();

        let serde_utils = self.serde_utils.to_string();

        let deserializers: String = self
            .interface
            .typedefs
            .iter()
            .filter_map(|(id, _)| {
                let info = self.infos[id];

                if info.contains(TypeInfo::RESULT) {
                    Some(self.print_deserialize_typedef(id))
                } else {
                    None
                }
            })
            .collect();

        let typedefs: String = self
            .interface
            .typedefs
            .iter()
            .map(|(id, _)| self.print_typedef(id))
            .collect();

        let functions: String = self
            .interface
            .functions
            .iter()
            .map(|func| self.print_function(&self.interface.ident.to_snake_case(), func))
            .collect();

        let mut contents =
            format!("{result_ty}{serde_utils}{deserializers}\n{typedefs}\n{functions}");

        if self.opts.prettier {
            postprocess(&mut contents, "prettier", ["--parser=typescript"])
                .expect("failed to run `rome format`");
        } else if self.opts.romefmt {
            postprocess(
                &mut contents,
                "rome",
                ["format", "--stdin-file-path", "index.ts"],
            )
            .expect("failed to run `rome format`");
        }

        let mut filename = PathBuf::from(self.interface.ident.to_kebab_case());
        filename.set_extension("ts");

        (filename, contents)
    }
}
