// src/services/user.ts
import {
    UserService as MedusaUserService,
} from "@medusajs/medusa"
import {
    CreateUserInput as MedusaCreateUserInput,
} from "@medusajs/medusa/dist/types/user"
import type StoreRepository from "@medusajs/medusa/dist/repositories/store"
import { Lifetime } from "awilix"



import { User } from "../models/user"
import StoreService from "./store"

type CreateUserInput = {
    store_id?: string
} & MedusaCreateUserInput

class UserService extends MedusaUserService {
    static LIFE_TIME = Lifetime.SCOPED
    protected readonly loggedInUser_: User | null
    protected readonly storeRepository_: typeof StoreRepository

    constructor(container, options) {
        // @ts-ignore
        super(...arguments)

        this.storeRepository_ = container.storeRepository

        try {
            this.loggedInUser_ = container.loggedInUser
        } catch (e) {
            // avoid errors when backend first runs
        }
    }

    async create(
        user: CreateUserInput,
        password: string
    ): Promise<User> {
        return await this.atomicPhase_(async (m) => {
            const storeRepo = m.withRepository(this.storeRepository_)

            if (!user.store_id) {
                let newStore = storeRepo.create()
                newStore = await storeRepo.save(newStore)
                user.store_id = newStore.id
            }

            const savedUser = await super.create(user, password)

            this.eventBus_.emit(StoreService.Events.CREATED, { id: user.store_id })
            
            return savedUser
        })
    }
}

export default UserService
