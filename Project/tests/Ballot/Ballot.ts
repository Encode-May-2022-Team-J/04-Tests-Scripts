import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToByte32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

async function giveRightVote(ballotContract: Ballot, voterAddress: any) {
  const tx = await ballotContract.giveRightToVote(voterAddress);
  await tx.wait();
}

describe("Ballot", function () {
  let ballotContract: Ballot;
  let accounts: any[];

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot");
    ballotContract = await ballotFactory.deploy(
      convertStringArrayToByte32(PROPOSALS)
    );
    await ballotContract.deployed();
  });

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(proposal.voteCount.toNumber()).to.eq(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const chairperson = await ballotContract.chairperson();
      expect(chairperson).to.eq(accounts[0].address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const chairpersonVoter = await ballotContract.voters(accounts[0].address);
      expect(chairpersonVoter.weight.toNumber()).to.eq(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const voterAddress = accounts[1].address;
      await giveRightVote(ballotContract, voterAddress);
      const voter = await ballotContract.voters(voterAddress);
      expect(voter.weight.toNumber()).to.eq(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const voterAddress = accounts[1].address;
      await giveRightVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        giveRightVote(ballotContract, voterAddress)
      ).to.be.revertedWith("The voter already voted");
    });

    it("can not give right to vote for someone that has already voting rights", async function () {
      const voterAddress = accounts[1].address;
      await giveRightVote(ballotContract, voterAddress);
      await expect(
        giveRightVote(ballotContract, voterAddress)
      ).to.be.revertedWith("");
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    // TODO
    it("gives vote", async function () {
      const voterAccount = accounts[1];
      const proposalIndex = 0;
      await giveRightVote(ballotContract, voterAccount.address);
      await ballotContract.connect(voterAccount).vote(proposalIndex);
      const proposal = await ballotContract.proposals(proposalIndex);
      expect(proposal.voteCount.toNumber()).to.eq(1);
    });
  });
  describe("when the voter interact with the delegate function in the contract", function () {
    // TODO
    it("delegates vote to another address", async function () {
      const fromAccount = accounts[1];
      const toAccount = accounts[2];
      await giveRightVote(ballotContract, toAccount.address);
      await ballotContract.connect(fromAccount).delegate(toAccount.address);
      const voter = await ballotContract.voters(toAccount.address);
      expect(voter.weight).to.eq(1);
    });
  });

  describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
    // TODO
    it("should not allow anyone other than owner to give right to vote", async function () {
      await expect(
        ballotContract.connect(accounts[1]).giveRightToVote(accounts[2].address)
      ).to.be.revertedWith("Only chairperson can give right to vote.");
    });
  });

  describe("when the an attacker interact with the vote function in the contract", function () {
    // TODO
    it("should not allow anyone without right to vote", async function () {
      await expect(
        ballotContract.connect(accounts[1]).vote(0)
      ).to.be.revertedWith("Has no right to vote");
    });
    it("should not allow voter vote more than once", async function () {
      const proposalIndex = 0;
      const voterAccount = accounts[1];
      await giveRightVote(ballotContract, voterAccount.address);
      await ballotContract.connect(voterAccount).vote(proposalIndex);
      await expect(
        ballotContract.connect(voterAccount).vote(proposalIndex)
      ).to.be.revertedWith("Already voted.");
    });
  });

  describe("when the an attacker interact with the delegate function in the contract", function () {
    // TODO
    it("should not allow voter who has already voted delegate vote to another address", async function () {
      const fromAccount = accounts[1];
      const toAccount = accounts[2];
      await giveRightVote(ballotContract, fromAccount.address);
      await ballotContract.connect(fromAccount).vote(0);
      await expect(
        ballotContract.connect(fromAccount).delegate(toAccount.address)
      ).to.be.revertedWith("You already voted.");
    });
    it("should not allow voter to self-delegate", async function () {
      const voterAccount = accounts[1];
      await expect(
        ballotContract.connect(voterAccount).delegate(voterAccount.address)
      ).to.be.revertedWith("Self-delegation is disallowed.");
    });
    it("should not allow loop in delegation", async function () {
      const account1 = accounts[1];
      const account2 = accounts[2];
      await giveRightVote(ballotContract, account2.address);
      await ballotContract.connect(account1).delegate(account2.address);
      await expect(
        ballotContract.connect(account2).delegate(account1.address)
      ).to.be.revertedWith("Found loop in delegation.");
    });

    it("should not allow anyone to delegate to wallet that cannot vote", async function () {
      await expect(
        ballotContract.connect(accounts[1]).delegate(accounts[2].address)
      ).to.be.revertedWith("");
    });
  });

  describe("when someone interact with the winningProposal function before any votes are cast", function () {
    // TODO
    it("show winningProposal is default value 0", async function () {
      const winningProposal = await ballotContract.winningProposal();
      expect(winningProposal.toNumber()).to.eq(0);
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
    // TODO
    it("show winningProposal is the first proposal", async function () {
      const votedProposalIndex = 0;
      const voterAccount = accounts[1];
      await giveRightVote(ballotContract, voterAccount.address);
      await ballotContract.connect(voterAccount).vote(votedProposalIndex);
      const winningProposal = await ballotContract.winningProposal();
      expect(winningProposal.toNumber()).to.eq(votedProposalIndex);
    });
  });

  describe("when someone interact with the winnerName function before any votes are cast", function () {
    // TODO
    it("show winnerName is default Proposal 1", async function () {
      const winnerName = await ballotContract.winnerName();
      expect(ethers.utils.parseBytes32String(winnerName)).to.eq(PROPOSALS[0]);
    });
  });

  describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
    // TODO
    it("show winnerName is the Proposal 1 after one vote is cast for Proposal 1", async function () {
      const votedProposalIndex = 0;
      const voterAccount = accounts[1];
      await giveRightVote(ballotContract, voterAccount.address);
      await ballotContract.connect(voterAccount).vote(votedProposalIndex);
      const winnerName = await ballotContract.winnerName();
      expect(ethers.utils.parseBytes32String(winnerName)).to.eq(
        PROPOSALS[votedProposalIndex]
      );
    });
  });

  describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    // TODO
    it("show winningProposal is the index of the most voted proposal", async function () {
      const voteResult = PROPOSALS.map(() => 0);
      for (let i = 1; i < 6; i++) {
        const votedProposalIndex = Math.floor(Math.random() * PROPOSALS.length);
        voteResult[votedProposalIndex] += 1;
        const voterAccount = accounts[i];
        await giveRightVote(ballotContract, voterAccount.address);
        await ballotContract.connect(voterAccount).vote(votedProposalIndex);
      }
      const winningProposal = await ballotContract.winningProposal();
      expect(winningProposal.toNumber()).to.eq(
        voteResult.indexOf(Math.max(...voteResult))
      );
    });
  });
});
