// src/models/payment.ts
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm'

import { Payment as MedusaPayment } from '@medusajs/medusa'

@Entity()
export class Payment extends MedusaPayment {
    @Index('PaymentParentId')
    @Column({ nullable: true })
    payment_parent_id?: string

    @ManyToOne(() => Payment, (payment) => payment.children)
    @JoinColumn({ name: 'payment_parent_id', referencedColumnName: 'id' })
    parent?: Payment

    @OneToMany(() => Payment, (payment) => payment.parent)
    @JoinColumn({ name: 'id', referencedColumnName: 'payment_parent_id' })
    children?: Payment[]
}
