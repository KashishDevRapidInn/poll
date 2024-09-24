import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Poll } from "../target/types/poll";
import { Keypair } from "@solana/web3.js";
import { assert } from "chai";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();
console.log(process.env.PHANTOM_SECRET_OWNER);
const phantomSecretKeyBase58 = process.env.PHANTOM_SECRET_OWNER;
const owner_pk = bs58.decode(phantomSecretKeyBase58);
const owner_keypair = Keypair.fromSecretKey(owner_pk);
describe("poll", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Poll as Program<Poll>;

  const pollkeypair = anchor.web3.Keypair.generate();

  it("Initialize poll!", async () => {
    console.log("Owner Public Key:", owner_keypair.publicKey.toString());
    console.log("Poll Public Key:", pollkeypair.publicKey.toString());
    const question = "What is your favorite color?";
    const options = ["Red", "Blue", "Green"];
    const pollingStartDate = Math.floor(Date.now() / 1000);
    const pollingStartDateBN = new BN(pollingStartDate);
    const pollingEndDate = pollingStartDate + 3600;
    const pollingEndDateBN = new BN(pollingEndDate);

    const tx_1 = await program.methods
      .initializePoll(question, options, pollingStartDateBN, pollingEndDateBN)
      .accounts({
        owner: owner_keypair.publicKey,
        poll: pollkeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner_keypair, pollkeypair])
      .rpc();
    const pollAccount = await program.account.poll.fetch(pollkeypair.publicKey);
    assert.equal(pollAccount.question, "What is your favorite color?");
    assert.deepEqual(pollAccount.options, ["Red", "Blue", "Green"]);
    assert.equal(pollAccount.votes.length, 3);
    for (let i = 0; i < pollAccount.votes.length; i++) {
      assert.equal(pollAccount.votes[i].toNumber(), 0);
    }

    console.log("Your transaction signature", tx_1);
  });
  it("Vote", async () => {
    const voter = anchor.web3.Keypair.generate();
    const votingChoice = 1;
    await program.methods
      .vote(votingChoice)
      .accounts({
        poll: pollkeypair.publicKey,
        voter: voter.publicKey,
        voterAcc: anchor.web3.Keypair.generate().publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();
  });

  it("View poll results", async () => {
    const results = await program.methods
      .viewResults()
      .accounts({
        poll: pollkeypair.publicKey,
      })
      .rpc();

    console.log("Poll results:", results);
    assert.isArray(results);
    assert.equal(results.length, 3);
    assert.equal(parseInt(results[0]), 1);
    assert.equal(parseInt(results[1]), 0);
    assert.equal(parseInt(results[2]), 0);
  });
});
