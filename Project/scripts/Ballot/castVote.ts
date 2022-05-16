import { Contract, ethers } from "ethers";
import "dotenv/config";
import { Ballot } from "../../typechain";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";

const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";

async function main() {
  if (process.argv.length < 3) throw new Error("Ballot address missing");
  const ballotAddress = process.argv[2];
  if (process.argv.length < 4) throw new Error("Proposal missing");
  const proposal = process.argv[3];

  const wallet =
    process.env.MNEMONIC && process.env.MNEMONIC.length > 0
      ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
      : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("ropsten", {
    etherscan: process.env.ETHERSCAN_API_KEY,
  });

  const signer = wallet.connect(provider);
  const balanceBN = await signer.getBalance();
  const balance = Number(ethers.utils.formatEther(balanceBN));
  console.log(`Wallet balance ${balance}`);
  if (balance < 0.01) {
    throw new Error("Not enough ether");
  }
  console.log(
    `Attaching ballot contract interface to address ${ballotAddress}`
  );
  const ballotContract: Ballot = new Contract(
    ballotAddress,
    ballotJson.abi,
    signer
  ) as Ballot;
  const voter = await ballotContract.voters(wallet.address);
  if (voter.voted) {
    throw new Error("Caller has already voted");
  }

  try {
    console.log(`Voter vote proposal no. ${proposal}`);
    const tx = await ballotContract.vote(proposal);
    console.log("Awaiting confirmations");
    await tx.wait();
    console.log(`Transaction completed. Hash: ${tx.hash}`);
  } catch (err: any) {
    throw new Error(err.error.reason);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
