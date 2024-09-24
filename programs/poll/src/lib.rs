use anchor_lang::prelude::*;

declare_id!("HgCqeiSjynVtgvB5jf8cwkY2W8nhw9vFZuKWpCUupRmy");

#[program]
pub mod poll {
    use super::*;

    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        question: String,
        options: Vec<String>,
        polling_start_date: u64,
        polling_end_date: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.owner = ctx.accounts.owner.key();
        poll.votes = vec![0, options.len() as u64];
        poll.question = question;
        poll.options = options;
        poll.polling_start_date = polling_start_date;
        poll.polling_end_date = polling_end_date;
        Ok(())
    }
    pub fn vote(ctx: Context<Vote>, voting_choice: u16) -> Result<()> {
        let voter_acc = &mut ctx.accounts.voter_acc;
        let poll = &mut ctx.accounts.poll;
        let current_time = Clock::get()?.unix_timestamp as u64;
        if current_time < poll.polling_start_date || current_time > poll.polling_end_date {
            return Err(PollError::PollingNotActive.into());
        };
        if voter_acc.has_voted {
            return Err(PollError::AlreadyVoted.into());
        };
        if voting_choice as usize >= poll.options.len() {
            return Err(PollError::InvalidOption.into());
        };
        poll.votes[voting_choice as usize - 1] += 1;
        voter_acc.has_voted = true;
        Ok(())
    }
    pub fn view_results(ctx: Context<ViewResults>) -> Result<Vec<u64>> {
        let poll = &ctx.accounts.poll;
        Ok(poll.votes.clone())
    }
}

#[derive(Accounts)]
pub struct InitializePoll<'info> {
    #[account(init, payer= owner, space=122)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
    #[account(init, payer= voter, space=8+32+1)]
    pub voter_acc: Account<'info, Voter>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ViewResults<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
}

#[account]
pub struct Poll {
    pub owner: Pubkey,
    pub question: String,
    pub options: Vec<String>,
    pub votes: Vec<u64>,
    pub polling_start_date: u64,
    pub polling_end_date: u64,
}

#[account]
pub struct Voter {
    pub voter_id: Pubkey,
    pub has_voted: bool,
}

#[error_code]
pub enum PollError {
    PollingNotActive,
    AlreadyVoted,
    InvalidOption,
}
