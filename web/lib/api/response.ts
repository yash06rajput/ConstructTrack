import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200 });
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}
