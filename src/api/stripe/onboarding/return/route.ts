// src/api/stripe/onboarding/return/route.ts

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

    const stripeConnectService = req.scope.resolve<StripeConnectService>('stripeConnectService')
    const stripeAccount = await stripeConnectService.retrieveStripeAccount(storeId as string)

    if (!stripeAccount.details_submitted || !stripeAccount.payouts_enabled) {
        // Redirect to admin dashboard on onboarding not completed
        res.redirect("http://localhost:7001")
        return
    }

    const manager: EntityManager = req.scope.resolve<EntityManager>('manager')

    await manager.transaction(async (manager) => {
        const storeRepo = manager.getRepository(Store)

        let store = await storeRepo.findOne({ where: { id: storeId as string } })

        if (!store) {
            logger.error('Stripe Onboarding Return Route: Store not found')
            return res.status(404).json({ error: 'Store not found' })
        }

        if (store.stripe_account_enabled) {
            logger.error('Stripe Onboarding Return Route: Stripe account already enabled')
            return res.status(400).json({ error: 'Stripe account already enabled' })
        }

        store.stripe_account_enabled = true
        store = await storeRepo.save(store)
    })

    // Redirect to admin dashboard on success
    res.redirect("http://localhost:7001")
}