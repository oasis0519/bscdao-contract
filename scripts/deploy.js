// @dev. This script will deploy this V1.1 of Olympus. It will deploy the whole ecosystem except for the LP tokens and their bonds. 
// This should be enough of a test environment to learn about and test implementations with the Olympus as of V1.1.
// Not that the every instance of the Treasury's function 'valueOf' has been changed to 'valueOfToken'... 
// This solidity function was conflicting w js object property name

const { ethers } = require("hardhat");
const { BigNumber } = ethers
const UniswapV2ABI = require('./IUniswapV2Factory.json').abi
const IUniswapV2Pair = require('./IUniswapV2Pair.json').abi

async function main() {

    const [deployer] = await ethers.getSigners();
    const MockDAO = deployer
    console.log('Deploying contracts with the account: ' + deployer.address);

    // Initial staking index
    const initialIndex = '1000000000';

    const blockNumber = await ethers.provider.getBlockNumber()
    // First block epoch occurs
    const firstEpochBlock = blockNumber + 100;

    // What epoch will be first epoch
    const firstEpochNumber = '1';

    // How many blocks are in each epoch
    const epochLengthInBlocks = '9600';

    // Initial reward rate for epoch
    const initialRewardRate = '3000';

    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Large number for approval for Frax and DAI
    const largeApproval = '100000000000000000000000000000000';

    // Initial mint for Frax and DAI (10,000,000)
    const initialMint = '10000000000000000000000000';

    // DAI bond BCV
    const daiBondBCV = '369';

    // Frax bond BCV
    const fraxBondBCV = '690';

    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLength = '144000';

    // Min bond price
    const minBondPrice = '100';

    // Max bond payout
    const maxBondPayout = '50'

    // DAO fee for bond
    const bondFee = '10000';

    // Max debt bond can take on
    const maxBondDebt = '1000000000000000';

    // Initial Bond debt
    const intialBondDebt = '0'

    // Deploy MUSH
    const MUSH = await ethers.getContractFactory('RaERC20Token');
    const mush = await MUSH.deploy();
    // const mush = MUSH.attach("0xD5C7Be8a684EaA8f342Efa7C5Ed7f811BB74FCC1")
    console.log("MUSH Contract: ", mush.address);

    // Deploy BUSD
    const BUSD = await ethers.getContractFactory('BUSD');
    const busd = await BUSD.deploy("97");
    // const busd = BUSD.attach("0xcd19C8B8D0a2E7836958c79Be8401a615a9F8ED4");
    console.log("BUSD Contract: ", busd.address);

    // Deploy 10,000,000 mock DAI and mock BUSD
    // await dai.mint(deployer.address, initialMint);
    await busd.mint(deployer.address, initialMint);
    
    const uniswapFactoryAddr = "0x01bf7c66c6bd861915cdaae475042d3c4bae16a7"
    const uniswapFactory = new ethers.Contract(
        uniswapFactoryAddr,
        UniswapV2ABI,
        deployer
    )
    await (await uniswapFactory.createPair(mush.address, dai.address)).wait(1)
    const lpAddress = await uniswapFactory.getPair(mush.address, dai.address)
    // const lpAddress = "0x371845f80cE44D3E3Eb6EE945C49c7fF1821d35D"
    console.log('LP created: ' + lpAddress)

    // Deploy treasury
    const Treasury = await ethers.getContractFactory('RaTreasury'); 
    const treasury = await Treasury.deploy(mush.address, dai.address, 0);
    // const treasury = Treasury.attach("0x3EB599D18B5d83a8821D9fcBeee5D719C2a604A9")
    console.log("Treasury Contract: ", treasury.address);

    // Deploy bonding calc
    const BondingCalculator = await ethers.getContractFactory('BondingCalculator');
    const bondingCalculator = await BondingCalculator.deploy( mush.address );
    // const bondingCalculator = BondingCalculator.attach("0x2293Aa4eB186a18ac0609B4F849B1E1C3e1Ce0F8")
    console.log("BondingCalculator Contract: ", bondingCalculator.address);

    // Deploy staking distributor
    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, mush.address, epochLengthInBlocks, firstEpochBlock);
    // const distributor = Distributor.attach("0x36BE2862447Ed0cff3144a26f071d9EdE6278F8c")
    console.log("Distributor Contract: ", distributor.address);

    // Deploy sMUSH
    const SMUSH = await ethers.getContractFactory('sRaERC20Token');
    const sMUSH = await SMUSH.deploy();
    // const sMUSH = SMUSH.attach("0x34E6342F1a007462eb8Fe84aca6A01A0a03F6b0d")
    console.log("sMUSH Contract: ", sMUSH.address);

    // Deploy Staking
    const Staking = await ethers.getContractFactory('RaStaking');
    const staking = await Staking.deploy(mush.address, sMUSH.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);
    // const staking = Staking.attach("0x7704141B340E03a04158d206d325843cCC68294E")
    console.log("Staking Contract: ", staking.address);

    // Deploy staking warmpup
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmpup.deploy(staking.address, sMUSH.address);
    // const stakingWarmup = StakingWarmpup.attach("0xD355b6a64872c6e50D6dD0C098b922a7B9458999")
    console.log("StakingWarmpup Contract: ", stakingWarmup.address);

    // Deploy staking helper
    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, mush.address);
    // const stakingHelper = StakingHelper.attach("0x5F3492BC89fb421B90A2B37c7778D91a7C52cB9A")
    console.log("StakingHelper Contract: ", stakingHelper.address);

    // Deploy BUSD bond
    const BUSDBond = await ethers.getContractFactory('BondDepository');
    const busdBond = await BUSDBond.deploy(mush.address, busd.address, treasury.address, MockDAO.address, zeroAddress);
    // const busdBond = BUSDBond.attach("0x701BD2d0C6a22A3a3A6d4Af3D524A5a9bb6c4C4f")
    console.log("BUSDBond Contract: ", busdBond.address);

    // Deploy redeem helper
    const RedemmHelper = await ethers.getContractFactory('RedeemHelper');
    const redemmHelper = await RedemmHelper.deploy();
    // const redemmHelper = RedemmHelper.attach("0xc108B433092c00dB9b1846E8B17d5b3a764B3030")
    console.log("RedemmHelper Contract: ", redemmHelper.address);

    // await redemmHelper.addBondContract(daiBond.address);
    await redemmHelper.addBondContract(busdBond.address);
    // await redemmHelper.addBondContract(daiRABond.address);

    // Deploy RACirculatingSupply helper
    const RACirculatingSupply = await ethers.getContractFactory('RACirculatingSupplyConrtact');
    const rACirculatingSupply = await RACirculatingSupply.deploy(deployer.address);
    // const rACirculatingSupply = RACirculatingSupply.attach("0xd4898183b8b765b8935B8528fA2B53706865D8c2")
    console.log("RACirculatingSupply Contract: ", rACirculatingSupply.address);
    // await rACirculatingSupply.initialize(mush.address);

    // queue and toggle DAI and BUSD bond reserve depositor
    // await treasury.queue('0', daiBond.address);
    await treasury.queue('0', busdBond.address);
    // await treasury.queue('4', daiRABond.address);
    // await treasury.toggle('0', daiBond.address, zeroAddress);
    await treasury.toggle('0', busdBond.address, zeroAddress);
    // await treasury.toggle('4', daiRABond.address, zeroAddress);
    console.log("Queue - Toggle Bond");

    // Set DAI and BUSD bond terms
    // await daiBond.initializeBondTerms(daiBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);
    await busdBond.initializeBondTerms(daiBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);

    // Set staking for DAI and Frax bond
    // await daiBond.setStaking(staking.address, stakingHelper.address);
    await busdBond.setStaking(staking.address, stakingHelper.address);
    console.log("Bonds Set Staking");

    // Initialize sOHM and set the index
    await sMUSH.initialize(staking.address);
    await sMUSH.setIndex(initialIndex);
    console.log("Staked MUSH Init");

    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address);
    await staking.setContract('1', stakingWarmup.address);
    console.log("Staking Set Contract");

    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate);
    console.log("Distributor addRecipient");

    // queue and toggle reward manager
    let tx = await treasury.queue('8', distributor.address);
    await tx.wait(1)
    await treasury.toggle('8', distributor.address, zeroAddress);
    console.log("Treasury Queue - Toggle Distributor");

    // queue and toggle deployer reserve depositor
    tx = await treasury.queue('0', deployer.address);
    await tx.wait(1)
    await treasury.toggle('0', deployer.address, zeroAddress);
    console.log("Treasury Queue - Toggle Token depositor");

    // queue and toggle liquidity depositor
    tx = await treasury.queue('4', deployer.address);
    await tx.wait(1)
    await treasury.toggle('4', deployer.address, zeroAddress);
    console.log("Treasury Queue - Toggle Liquid depositor");

    // Approve the treasury to spend DAI and Frax
    // await dai.approve(treasury.address, largeApproval );
    await busd.approve(treasury.address, largeApproval);
    console.log("Approve Stable Coin for Treasury");

    // Approve dai and frax bonds to spend deployer's DAI and Frax
    // await dai.approve(daiBond.address, largeApproval );
    await busd.approve(busdBond.address, largeApproval);
    console.log("Approve Stable Coin for Bond");

    // Approve staking and staking helper contact to spend deployer's MUSH
    await mush.approve(staking.address, largeApproval);
    await mush.approve(stakingHelper.address, largeApproval);
    console.log("Approve MUSH Token");

    // Set treasury for OHM token
    await mush.setVault(deployer.address);
    console.log("MUSH Token Set Vault For Deployer");
    await mush.mint(deployer.address, 55000 * 10 ** 9)
    console.log("MUSH Token Mint For Deployer");
    // Set treasury for OHM token
    await mush.setVault(treasury.address);
    console.log("MUSH Token Set Vault");

    const lp = new ethers.Contract(lpAddress, IUniswapV2Pair, deployer)
    await (await lp.approve(treasury.address, largeApproval)).wait(1)
    const lpRAAmount = 50000
    const initialAxePriceInLP = 0.6
    tx = await mush.transfer(
        lpAddress,
        BigNumber.from(lpRAAmount).mul(BigNumber.from(10).pow(9))
    )
    tx1 = await dai.transfer(
            lpAddress,
            BigNumber.from(lpRAAmount * initialAxePriceInLP).mul(
            BigNumber.from(10).pow(18)
        )
    )
    await Promise.all([tx.wait(), tx1.wait()])
    console.log("Deposit to LP");
    await (await lp.mint(deployer.address)).wait()
    console.log("mint lp")

    // deposit lp bond with full profit
    const lpBalance = await lp.balanceOf(deployer.address)
    const valueOfLPToken = await treasury.valueOf(lpAddress, lpBalance)
    await (await treasury.deposit(lpBalance, lpAddress, valueOfLPToken)).wait(1)
    console.log("deposit lp bond with full profit")

    // console.log( "OHM: " + ohm.address );
    // console.log( "DAI: " + dai.address );
    // console.log( "Frax: " + frax.address );
    // console.log( "Treasury: " + treasury.address );
    // console.log( "Calc: " + olympusBondingCalculator.address );
    // console.log( "Staking: " + staking.address );
    // console.log( "sOHM: " + sOHM.address );
    // console.log( "Distributor " + distributor.address);
    // console.log( "Staking Wawrmup " + stakingWarmup.address);
    // console.log( "Staking Helper " + stakingHelper.address);
    // console.log("DAI Bond: " + daiBond.address);
    // console.log("Frax Bond: " + fraxBond.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})