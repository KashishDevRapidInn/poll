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

const phantomSecretKeyBase58_voter = process.env.PHANTOM_SECRET_VOTER;
const voter_pk = bs58.decode(phantomSecretKeyBase58_voter);
const voter_keypair = Keypair.fromSecretKey(voter_pk);
const voterAcc = anchor.web3.Keypair.generate();

const MAX_OPTIONS = 10;
const STRING_LENGTH = 32;

function stringToFixedByteArray(str, length) {
  const buffer = Buffer.alloc(length);
  const strBytes = Buffer.from(str, "utf-8");
  strBytes.copy(buffer);
  return Array.from(buffer);
}

const question = stringToFixedByteArray(
  "What is your favorite color?",
  STRING_LENGTH
);
const options = [
  stringToFixedByteArray("Red", STRING_LENGTH),
  stringToFixedByteArray("Blue", STRING_LENGTH),
  stringToFixedByteArray("Green", STRING_LENGTH),
];

while (options.length < MAX_OPTIONS) {
  options.push(stringToFixedByteArray("", STRING_LENGTH));
}

describe("poll", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Poll as Program<Poll>;

  const pollkeypair = anchor.web3.Keypair.generate();

  it("Initialize poll!", async () => {
    console.log("Owner Public Key:", owner_keypair.publicKey.toString());
    console.log("Poll Public Key:", pollkeypair.publicKey.toString());
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

    console.log("Fetched Question:", pollAccount.question);
    console.log("Type of fetched question:", typeof pollAccount.question);
    console.log("Type of expected question:", typeof question);
    console.log("Expected Question:", question);

    console.log("Your transaction signature", tx_1);
  });
  it("Vote", async () => {
    const votingChoice = 1;
    await program.methods
      .vote(votingChoice)
      .accounts({
        poll: pollkeypair.publicKey,
        voter: voter_keypair.publicKey,
        voterAcc: voterAcc.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voterAcc, voter_keypair])
      .rpc();
  });

  it("View poll results", async () => {
    const results = await program.methods
      .viewResults()
      .accounts({
        poll: pollkeypair.publicKey,
      })
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollkeypair.publicKey);
    const resultsArray = pollAccount.votes;
    assert.equal(
      resultsArray[0].toNumber(),
      1,
      "Expected vote count for option 1 to be 1"
    );
    assert.equal(
      resultsArray[1].toNumber(),
      0,
      "Expected vote count for option 2 to be 0"
    );
    assert.equal(
      resultsArray[2].toNumber(),
      0,
      "Expected vote count for option 3 to be 0"
    );
  });

  it("Voting again", async () => {
    const voterAcc = anchor.web3.Keypair.generate();
    const votingChoice = 1;

    await program.methods
      .vote(votingChoice)
      .accounts({
        poll: pollkeypair.publicKey,
        voterAcc: voterAcc.publicKey,
        voter: voter_keypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter_keypair, voterAcc])
      .rpc();
  });
  it("View poll results", async () => {
    const results = await program.methods
      .viewResults()
      .accounts({
        poll: pollkeypair.publicKey,
      })
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollkeypair.publicKey);
    const resultsArray = pollAccount.votes;
    assert.equal(
      resultsArray[0].toNumber(),
      2,
      "Expected vote count for option 1 to be 2"
    );
    assert.equal(
      resultsArray[1].toNumber(),
      0,
      "Expected vote count for option 2 to be 0"
    );
    assert.equal(
      resultsArray[2].toNumber(),
      0,
      "Expected vote count for option 3 to be 0"
    );
  });
});
