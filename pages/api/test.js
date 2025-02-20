import 'dotenv/config';
import { generateAddress } from '../../utils/kdf';
import { ethereum } from '../../utils/ethereum';

export default async function test(req, res) {
    const { address, publicKey } = await generateAddress({
        publicKey: process.env.MPC_PUBLIC_KEY,
        accountId: process.env.NEXT_PUBLIC_contractId,
        path: 'shadeagent007',
        chain: 'evm',
    });

    const res2 = await ethereum.call({
        from: address,
    });

    res.status(200).json({
        address,
        publicKey,
        res2,
    });
}
