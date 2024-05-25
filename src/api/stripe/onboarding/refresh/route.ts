import type { Logger, MedusaRequest, MedusaResponse } from '@medusajs/medusa'
import type { EntityManager } from 'typeorm'

import { Store } from '../../../../models/store'
import type StripeConnectService from '../../../../services/stripe-connect'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const storeId = req.query.storeId
    const logger = req.scope.resolve<Logger>('logger')

    if (!storeId) {
        logger.error('Stripe Onboarding Return Route: Missing storeId')
        return res.status(400).json({ error: 'Missing storeId' })
    }

    const manager: EntityManager = req.scope.resolve<EntityManager>('manager')

    let redirectUrl = ''

    await manager.transaction(async (m) => {
        const stripeConnectService = req.scope.resolve<StripeConnectService>('stripeConnectService')
        const storeRepo = m.getRepository(Store)

        await stripeConnectService.withTransaction(m).createOnboardingLink(storeId as string)

        const store = await storeRepo.findOne({ where: { id: storeId as string } })

        redirectUrl = store.metadata.stripe_onboarding_url as string
    })


    res.redirect(redirectUrl)
}
