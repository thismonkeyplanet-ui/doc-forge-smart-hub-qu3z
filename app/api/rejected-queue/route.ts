import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'

import getRejectedQueueModel from '@/models/RejectedQueue'

async function handler(req: NextRequest) {
  try {
    const Model = await getRejectedQueueModel()

    if (req.method === 'GET') {
      const data = await Model.find()
      return NextResponse.json({ success: true, data })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const doc = await Model.create({ ...body, owner_user_id: getCurrentUserId() })
      return NextResponse.json({ success: true, data: doc })
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
      await Model.findByIdAndDelete(id)
      return NextResponse.json({ success: true, data: { deleted: id } })
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}

const protectedHandler = authMiddleware(handler)
export const GET = protectedHandler
export const POST = protectedHandler
export const DELETE = protectedHandler
