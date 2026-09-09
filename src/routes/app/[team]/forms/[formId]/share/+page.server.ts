import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	return { qrUrl: `/app/${params.team}/forms/${params.formId}/share/qr` };
};
