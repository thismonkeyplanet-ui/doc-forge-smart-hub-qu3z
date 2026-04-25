import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'
import getDocumentModel from '@/models/Document'

async function handler(req: NextRequest) {
  try {
    if (req.method !== 'POST') {
      return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
    }

    const body = await req.json()
    const { url, title } = body

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    // Fetch content from the URL
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html,text/plain,application/json,*/*' },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    let content = ''

    if (contentType.includes('text/html')) {
      const html = await response.text()
      // Strip HTML tags to get plain text
      content = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    } else {
      content = await response.text()
    }

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: 'No readable content found at the URL' },
        { status: 400 }
      )
    }

    // Truncate if too long
    const maxLen = 50000
    if (content.length > maxLen) {
      content = content.substring(0, maxLen) + '\n\n[Content truncated...]'
    }

    // Derive a title from URL if not provided
    const docTitle = title?.trim() || new URL(url).pathname.split('/').filter(Boolean).pop() || new URL(url).hostname

    const Model = await getDocumentModel()
    const doc = await Model.create({
      workspace_id: 'default',
      title: docTitle,
      sections: [{ title: 'Imported Content', content, order: 0 }],
      tags: ['imported', 'url'],
      source_url: url,
      owner_user_id: getCurrentUserId(),
    })

    return NextResponse.json({
      success: true,
      data: doc,
      message: `Imported ${content.length} characters from ${url}`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import from URL' },
      { status: 500 }
    )
  }
}

const protectedHandler = authMiddleware(handler)
export const POST = protectedHandler
