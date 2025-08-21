use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{mint_to, Mint, MintTo, Token, TokenAccount}};

use crate::{StakeConfig, UserAccount};
use crate::error::StakeError;

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds=[b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, StakeConfig>,


    #[account(
        seeds =[b"rewards", config.key().as_ref()],
        bump = config.reward_bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds=[b"user", user.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init_if_needed,
        payer=user,
        associated_token::mint = reward_mint,
        associated_token::authority = user
    )]
    pub reward_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl Claim<'_> {
    pub fn claim(&mut self) -> Result<()> {

        require!(self.user_account.points > 0, StakeError::NoRewardsToClaim);

        let cpi_program = self.token_program.to_account_info();

        let seeds: &[&[u8]] = &[b"config", &[self.config.bump]];
        let signer_seeds = &[seeds];
        let mint_amount = self.user_account.points as u64 * 10_u64.pow(self.reward_mint.decimals as u32);

        let cpi_accounts = MintTo {
            mint: self.reward_mint.to_account_info(),
            to: self.reward_ata.to_account_info(),
            authority: self.config.to_account_info(),
        };
        let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(cpi_context, mint_amount)?;

        self.user_account.points = 0;
        Ok(())
    }
}