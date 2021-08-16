App = {
	contracts: {},
	init: async () => {
		await App.loadWeb3();
		await App.loadAccount();
		await App.loadContract();
		await App.renderBalance();
		await App.renderTasks();
	},
	loadWeb3: async () => {
		console.log(web3)
		if (web3) {
			const godwokenRpcUrl = "http://godwoken-testnet-web3-rpc.ckbapp.dev"
			const providerConfig = {
    		rollupTypeHash: "0x4cc2e6526204ae6a2e8fcf12f7ad472f41a1606d5b9624beebd215d780809f6a",
    		ethAccountLockCodeHash: "0xdeec13a7b8e100579541384ccaf4b5223733e4a5483c3aec95ddc4c1d5ea5b22",
    		web3Url: godwokenRpcUrl
			};
			App.web3Provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
			web3 = new Web3(App.web3Provider);
		} else {
			console.log("No ethereum browser is installed. Try installing MetaMask");
		}
	},
	loadAccount: async () => {
		const accounts = await window.ethereum.request({
			method: "eth_requestAccounts",
		});
		App.account = accounts[0];
	},

  // @truffle/contract functions setProvider(), deployed()
	loadContract: async () => {
		try {
			const contractAddress = "0x7b48a182479126cac52d6a4637b21ce4cc309656"
			const SUDTContractAddress = "0x6ec874374Da4b26Ca96E69d67549CB2f7c602964";
			const res = await fetch("TasksContract.json");
			const sudt_res = await fetch("ERC20.json");
			const tasksContractJSON = await res.json();
			const sudtContractJSON = await sudt_res.json();
			if (contractAddress) {
				console.log("Using deployed contract")
				App.tasksContract = new web3.eth.Contract(tasksContractJSON.abi, contractAddress);
			} else {
				console.log("Deploying main contract")
				App.tasksContract = new web3.eth.Contract(tasksContractJSON.abi);
				await App.tasksContract.deploy({
					data: tasksContractJSON.bytecode,
	        arguments: []
				}).send({
	        from: App.account,
	        gas: 6000000,
	        to: '0x0000000000000000000000000000000000000000',
	    	});
				console.log(App.tasksContract)
			}

			if (SUDTContractAddress) {
				console.log("Using deployed contract")
				App.ERC20Contract = new web3.eth.Contract(sudtContractJSON.abi, SUDTContractAddress);
			} else {
				const SUDT_NAME = 'MyToken';
				const SUDT_SYMBOL = 'MTK';
				const SUDT_TOTAL_SUPPLY = 9999999999;
				const SUDT_ID = '164';

				console.log("Deploying ERC20 contract")
				App.ERC20Contract = new web3.eth.Contract(sudtContractJSON.abi);
				await App.ERC20Contract.deploy({
					data: sudtContractJSON.bytecode,
	        arguments: [SUDT_NAME, SUDT_SYMBOL, SUDT_TOTAL_SUPPLY, SUDT_ID]
				}).send({
	        from: App.account,
	        gas: 6000000,
	        to: '0x0000000000000000000000000000000000000000',
	    	});
				console.log(App.ERC20Contract)
			}
		} catch (error) {
			console.error(error);
		}
	},

  // render account balance as inner text
	renderBalance: async () => {
		const addressTranslator = new AddressTranslator();
		const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(App.account);
		const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, App.account);
		document.getElementById("account").innerText = App.account;
		document.getElementById("p-account").innerText = polyjuiceAddress;
		document.getElementById("ld-account").innerText = depositAddress.addressString;
		console.log(await App.ERC20Contract.methods.balanceOf(polyjuiceAddress).call({
        from: App.account
    }));
	},

  // render tasks
	renderTasks: async () => {
		const taskCounter = await App.tasksContract.methods.taskCounter().call({
			gas: 6000000,
			from: App.account,
		});
		// const taskCounterNumber = taskCounter.toNumber();
		const taskCounterNumber = parseInt(taskCounter);

		let html = "";

		for (let i = 1; i <= taskCounterNumber; i++) {
			const task = await App.tasksContract.methods.tasks(i).call({
				gas: 6000000,
				from: App.account,
			});
			// const taskId = task[0].toNumber();
			const taskId = parseInt(task[0])
			const taskTitle = task[1];
			const taskDescription = task[2];
			const taskDone = task[3];
			const taskCreatedAt = task[4];

			// Creating a task Card
			let taskElement = `
        <div class="card bg-light rounded-0 mb-2">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${taskTitle}</span>
          </div>
          <div class="card-body">
            <span>${taskDescription}</span>
            <p class="text-muted">Task was created ${new Date(
							taskCreatedAt * 1000
						).toLocaleString()}</p>
            </label>
          </div>
        </div>
      `;
			html += taskElement;
		}

		document.querySelector("#tasksList").innerHTML = html;
	},
	createTask: async (title, description) => {
		try {
			const result = await App.tasksContract.methods.createTask(title, description).call({
				gas: 6000000,
				from: App.account,
			});
			alert("After the transaction completes, please refresh the webpage.")
		} catch (error) {
			console.error(error);
		}
	},
	toggleDone: async (element) => {
		const taskId = element.dataset.id;
		await App.tasksContract.methods.toggleDone(taskId).call({
			gas: 6000000,
			from: App.account,
		});
		window.location.reload();
	},
};
