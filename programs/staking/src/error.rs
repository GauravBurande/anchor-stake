use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("Max amount of stake reached!")]
    MaxStakeReached,

    #[msg("You cannot unstake between the freeze period!")]
    FreezePeriodNotOver,

    #[msg("Not frozen")]
    NotFrozen,

    #[msg("Nothing to unstake")]
    NothingToUnstake,

    #[msg("You have no rewards to claim.")]
    NoRewardsToClaim,

    #[msg("Underflow")]
    Underflow,

    #[msg("Overflow")]
    Overflow
}