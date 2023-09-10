pub use futures::stream::Stream;
pub use generational_arena::Arena as ResourceTable;
pub use tauri_bindgen_host_macro::*;
#[doc(hidden)]
pub use {anyhow, async_trait::async_trait, bitflags, ipc_router_wip, serde, tauri, tracing};

pub type ResourceId = u64;

pub type Result<T> = anyhow::Result<T>;

// #[derive(Debug)]
// pub struct ResourceId<T> {
//     id: generational_arena::Index,
//     _m: PhantomData<T>,
// }

// impl<T> Clone for ResourceId<T> {
//     fn clone(&self) -> Self {
//         Self {
//             id: self.id.clone(),
//             _m: PhantomData,
//         }
//     }
// }

// impl<T> Copy for ResourceId<T> {}

// impl<T> PartialEq for ResourceId<T> {
//     fn eq(&self, other: &Self) -> bool {
//         self.id == other.id
//     }
// }

// impl<T> Eq for ResourceId<T> {}
