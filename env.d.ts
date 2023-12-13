export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL: string;
			SUPABASE_ANON_KEY: string;
			SUPABASE_SERVICE_KEY: string;
			SUPABASE_API_URL: string;
		}
	}
}
