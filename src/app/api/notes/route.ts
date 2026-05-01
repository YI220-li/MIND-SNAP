import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const notes = await prisma.note.findMany({
    where: q ? { content: { contains: q } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const result = notes.map((note) => ({
    ...note,
    tags: JSON.parse(note.tags) as string[],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, tags } = body as { content?: string; tags?: string[] };

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "content 不能为空" },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        content: content.trim(),
        tags: JSON.stringify(tags ?? []),
      },
    });

    return NextResponse.json(
      { ...note, tags: JSON.parse(note.tags) as string[] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "请求处理失败" },
      { status: 500 }
    );
  }
}
