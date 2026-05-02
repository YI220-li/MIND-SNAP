import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PUT(request: NextRequest, segmentData: { params: Params }) {
  const params = await segmentData.params;
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "无效的笔记 ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { content, tags } = body as { content?: string; tags?: string[] };

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content 不能为空" }, { status: 400 });
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        content: content.trim(),
        tags: JSON.stringify(tags ?? []),
      },
    });

    return NextResponse.json({
      ...note,
      tags: JSON.parse(note.tags) as string[],
    });
  } catch {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, segmentData: { params: Params }) {
  const params = await segmentData.params;
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "无效的笔记 ID" }, { status: 400 });
  }

  try {
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }
}
