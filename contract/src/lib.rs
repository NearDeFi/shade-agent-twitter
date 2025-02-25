use hex::decode;
use near_sdk::{
    env::{self, block_timestamp},
    log, near, require,
    store::{IterableMap, IterableSet},
    AccountId, Gas, NearToken, PanicOnDefault, Promise,
};

use dcap_qvl::verify;

mod collateral;
mod ecdsa;
mod external;
mod utils;

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Worker {
    checksum: String,
    codehash: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    pub approved_codehashes: IterableSet<String>,
    pub worker_by_account_id: IterableMap<AccountId, Worker>,
}

#[near]
impl Contract {
    #[init]
    #[private]
    pub fn init(owner_id: AccountId) -> Self {
        Self {
            owner_id,
            approved_codehashes: IterableSet::new(b"a"),
            worker_by_account_id: IterableMap::new(b"b"),
        }
    }

    // helpers for method access control

    pub fn require_owner(&mut self) {
        require!(env::predecessor_account_id() == self.owner_id);
    }

    pub fn approve_codehash(&mut self, codehash: String) {
        // !!! UPGRADE TO YOUR METHOD OF MANAGING APPROVED WORKER AGENT CODEHASHES !!!
        self.require_owner();
        self.approved_codehashes.insert(codehash);
    }

    pub fn require_approved_codehash(&mut self) {
        let worker = self.get_worker(env::predecessor_account_id());
        require!(self.approved_codehashes.contains(&worker.codehash));
    }

    // register args see: https://github.com/mattlockyer/based-agent-template/blob/main/pages/api/register.js

    pub fn register_worker(
        &mut self,
        quote_hex: String,
        collateral: String,
        checksum: String,
        codehash: String,
    ) -> bool {
        // uncomment this line to only allow workers to register if their codehash arg is approved
        // require!(self.approved_codehashes.contains(&codehash));

        let collateral = collateral::get_collateral(collateral);
        let quote = decode(quote_hex).unwrap();
        let now = block_timestamp() / 1000000000;
        let result = verify::verify(&quote, &collateral, now);

        // log!("{:?}", result);

        if result.ok().is_some() {
            let predecessor = env::predecessor_account_id();
            self.worker_by_account_id
                .insert(predecessor, Worker { checksum, codehash });
            return true;
        }
        false
    }

    pub fn get_signature(&mut self, payload: Vec<u8>, path: String) -> Promise {
        self.require_approved_codehash();

        ecdsa::get_sig(payload, path, 0)
    }

    // views

    pub fn get_worker(&self, account_id: AccountId) -> Worker {
        self.worker_by_account_id
            .get(&account_id)
            .unwrap()
            .to_owned()
    }
}
