import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'

import getPublishedLinkModel from '@/models/PublishedLink'

async function handler(req: NextRequest) {
  try {
    const Model = await getPublishedLinkModel()

    if (req.method === 'GET') {
      const data = await Model.find()
      return NextResponse.json({ success: true, data })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const doc = await Model.create({ ...body, owner_user_id: getCurrentUserId() })
      return NextResponse.json({ success: true, data: doc })
    }

    if (req.method === 'PUT') {
      const body = await req.json()
      const { _id, ...update } = body
      if (!_id) return NextResponse.json({ success: false, error: 'Missing _id' }, { status: 400 })
      const doc = await Model.findByIdAndUpdate(_id, update, { new: true })
      return NextResponse.json({ success: true, data: doc })
    }

    if (req.method === 'DELETE') {
      const id = req.nextUrl.searchParams.get('id')
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
      await Model.findByIdAndDelete(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}

const protectedHandler = authMiddleware(handler)
export const GET = protectedHandler
export const POST = protectedHandler
export const PUT = protectedHandler
export const DELETE = protectedHandler
