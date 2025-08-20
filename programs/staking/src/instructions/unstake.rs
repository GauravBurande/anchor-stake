use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{ mpl_token_metadata::instructions::{ThawDelegatedAccountCpi, ThawDelegatedAccountCpiAccounts}, MasterEditionAccount, Metadata, MetadataAccount}, token::{ revoke, Mint, Revoke, Token, TokenAccount}
};
use crate::{StakeAccount, StakeConfig, UserAccount};
use crate::error::StakeError;

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        close = user,
        seeds=[b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, StakeConfig>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = user
    )]
    pub user_nft_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            nft_mint.key().as_ref()
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub metadata: Account<'info, MetadataAccount>,

    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            nft_mint.key().as_ref(),
            b"edition"
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub edition: Account<'info, MasterEditionAccount>,
    
     #[account(
        mut,
        seeds = [b"stake".as_ref(), nft_mint.key().as_ref(), config.key().as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>
}

impl Unstake<'_> {
    pub fn unstake(&mut self) -> Result<()> {
        let time_elapsed = ((Clock::get()?.unix_timestamp - self.stake_account.staked_at) /86400) as u32;

        require!(time_elapsed > self.config.freeze_period, StakeError::FreezePeriodNotOver);

        self.user_account.points += time_elapsed * self.config.points_per_stake as u32;

        let metadata_program = &self.metadata_program.to_account_info();
        let accounts = ThawDelegatedAccountCpiAccounts {
            delegate: &self.stake_account.to_account_info(),
            edition: &self.edition.to_account_info(),
            mint: &self.nft_mint.to_account_info(),
            token_account: &self.user_nft_ata.to_account_info(),
            token_program: &self.token_program.to_account_info()
        };

        let seeds = [
            b"stake",
            self.nft_mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.stake_account.bump]
        ];

        let signer_seeds = &[&seeds[..]];

        ThawDelegatedAccountCpi::new(metadata_program, accounts).invoke_signed(signer_seeds)?;

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Revoke {
            authority: self.stake_account.to_account_info(),
            source: self.user_nft_ata.to_account_info()
        };

        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        revoke(cpi_context)?;
        
        self.user_account.amount_staked -=1;

        Ok(())
    }
}