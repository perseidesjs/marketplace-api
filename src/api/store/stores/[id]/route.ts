import { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import StoreRepository from "@medusajs/medusa/dist/repositories/store";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const storeRepo = req.scope.resolve<typeof StoreRepository>('storeRepository')

    const storeId = req.params.id

    const store = await storeRepo.findOne({
        where: {
            id: storeId
        }
    })


    if (!store) {
        res.status(404).json({ message: "Not found" })
        return
    }

    const { stripe_account_enabled, stripe_account_id, metadata, ...rest } = store
    res.json({ store: rest })
}