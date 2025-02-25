import 'dotenv/config';
import { generateAddress } from '../../utils/kdf';
import { networkId } from '../../utils/near-provider';
import { ethereum } from '../../utils/ethereum';

export default async function getAddress(req, res) {
    console.log('Running on NEAR', networkId);

    const { address } = await generateAddress({
        publicKey:
            networkId === 'testnet'
                ? process.env.MPC_PUBLIC_KEY_TESTNET
                : process.env.MPC_PUBLIC_KEY_MAINNET,
        accountId: process.env.NEXT_PUBLIC_contractId,
        path: 'shadeagent007',
        chain: 'evm',
    });

    await ethereum.call({
        from: address,
    });

    res.status(200).json({
        address,
    });
}
