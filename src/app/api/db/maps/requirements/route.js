import db from "../../connection";
import { NextResponse } from "next/server";

/**
 * @param {import('next/server').NextRequest} req
 */
export const GET = async () => {
   const collection = db.collection("requirements");
   const requirements = await collection.findOne();
   return NextResponse.json(requirements);
};
