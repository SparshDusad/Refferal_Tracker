import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function GET(request:NextRequest) {
 const url = new URL(request.url); const code = url.searchParams.get("code");
 const requested = url.searchParams.get("next"); const next = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
 if (!code) return NextResponse.redirect(new URL("/?auth=missing_code", url.origin));
 const project = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!project || !key) return NextResponse.redirect(new URL("/?auth=configuration_error", url.origin));
 const response = NextResponse.redirect(new URL(next,url.origin));
 const supabase = createServerClient(project,key,{cookies:{getAll(){return request.cookies.getAll();},setAll(values){values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error) return NextResponse.redirect(new URL("/?auth=callback_error",url.origin));
 return response;
}
