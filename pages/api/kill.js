import 'dotenv/config';
import { getAccount } from '../../utils/near-provider';

export default async function kill(req, res) {
    const account = await getAccount();
    await account.deleteAccount(process.env.NEXT_PUBLIC_contractId);

    res.status(200).json({
        killed: true,
    });
}
