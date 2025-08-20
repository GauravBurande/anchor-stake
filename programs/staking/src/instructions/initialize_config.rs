use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::StakeConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer=admin, 
        seeds=[b"config"],
        space = 8 + StakeConfig::INIT_SPACE,
        bump
    )]
    pub config: Account<'info, StakeConfig>,

    #[account(
        init,
        payer=admin,
        seeds=[b"rewards", config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub reward_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    // TODO: understwand why we need this and what's Sysvar?
    pub rent: Sysvar<'info, Rent>
}

impl InitializeConfig<'_> {
    pub fn initialize_config(&mut self, points_per_stake:u8, max_stake:u8, freeze_period:u32, bumps:InitializeConfigBumps) -> Result<()> {
        self.config.set_inner(StakeConfig { points_per_stake, max_stake, freeze_period, reward_bump: bumps.reward_mint, bump: bumps.config });
        Ok(())
    }
}