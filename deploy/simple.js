const { connect, KeyPair, keyStores, utils } = require("near-api-js");
const { parseNearAmount, formatNearAmount } = require("near-api-js/lib/utils/format");
const path = require("path");
const homedir = require("os").homedir();
  
let LINKDROP_PROXY_CONTRACT_ID = process.env.LINKDROP_PROXY_CONTRACT_ID;
let FUNDING_ACCOUNT_ID = process.env.FUNDING_ACCOUNT_ID;
let LINKDROP_NEAR_AMOUNT = process.env.LINKDROP_NEAR_AMOUNT;
let SEND_MULTIPLE = process.env.SEND_MULTIPLE;

let OFFSET = 0.1;

let NETWORK_ID = "testnet";
let near;
let config;
let keyStore;

// set up near
const initiateNear = async () => {
	const CREDENTIALS_DIR = ".near-credentials";

	const credentialsPath = (await path).join(homedir, CREDENTIALS_DIR);
	(await path).join;
	keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

	config = {
		networkId: NETWORK_ID,
		keyStore,
		nodeUrl: "https://rpc.testnet.near.org",
		walletUrl: "https://wallet.testnet.near.org",
		helperUrl: "https://helper.testnet.near.org",
		explorerUrl: "https://explorer.testnet.near.org",
	};

	near = await connect(config);
};

async function start() {
	//deployed linkdrop proxy contract
	await initiateNear();

	if(!LINKDROP_PROXY_CONTRACT_ID || !FUNDING_ACCOUNT_ID || !LINKDROP_NEAR_AMOUNT || !SEND_MULTIPLE) {
		throw "must specify proxy contract ID, funding account ID, linkdrop $NEAR amount and whether to send multiple";
	}

	const contractAccount = await near.account(LINKDROP_PROXY_CONTRACT_ID);
	const fundingAccount = await near.account(FUNDING_ACCOUNT_ID);

	console.log(`initializing contract for account ${LINKDROP_PROXY_CONTRACT_ID}`);
	try {
		await contractAccount.functionCall(
			LINKDROP_PROXY_CONTRACT_ID, 
			'new', 
			{
				linkdrop_contract: "testnet",
			}, 
			"300000000000000", 
		);
	} catch(e) {
		console.log('error initializing contract: ', e);
	}

	let keyPairs = [];
	let pubKeys = [];

	if(SEND_MULTIPLE != "false") {
		console.log("BATCH Creating keypairs");
		for(var i = 0; i < 5; i++) {
			console.log('i: ', i);
			let keyPair = await KeyPair.fromRandom('ed25519'); 
			keyPairs.push(keyPair);   
			pubKeys.push(keyPair.publicKey.toString());   
		}
		console.log("Finished.");
	} else {
		let keyPair = await KeyPair.fromRandom('ed25519'); 
		keyPairs.push(keyPair);   
		pubKeys.push(keyPair.publicKey.toString());   
	}

	try {
		if(SEND_MULTIPLE != "false") {
			await fundingAccount.functionCall(
				LINKDROP_PROXY_CONTRACT_ID, 
				'send_multiple', 
				{
					public_keys: pubKeys,
					balance: parseNearAmount(LINKDROP_NEAR_AMOUNT)
				}, 
				"300000000000000", 
				parseNearAmount(((parseFloat(LINKDROP_NEAR_AMOUNT) + OFFSET) * pubKeys.length).toString())
			);
		} else {
			console.log("Sending one linkdrop");
			await fundingAccount.functionCall(
				LINKDROP_PROXY_CONTRACT_ID, 
				'send', 
				{
					public_key: pubKeys[0],
					balance: parseNearAmount(LINKDROP_NEAR_AMOUNT)
				}, 
				"300000000000000", 
				parseNearAmount((parseFloat(LINKDROP_NEAR_AMOUNT) + OFFSET).toString())
			);
		}
		
	} catch(e) {
		console.log('error initializing contract: ', e);
	}
    
	for(var i = 0; i < keyPairs.length; i++) {
		console.log(`https://wallet.testnet.near.org/linkdrop/${LINKDROP_PROXY_CONTRACT_ID}/${keyPairs[i].secretKey}`);
		console.log("Pub Key: ", keyPairs[i].publicKey.toString());
	}
}


start();