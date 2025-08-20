pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("4utWWt2cTwPTb9xffaKM4reixM2GfmniYnTTdkzEadCW");

#[program]
pub mod staking {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //     initialize_user::handler(ctx)
    // }
}
