import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';

export default function Dashboard() {
    return (
        <>
            <Head title="StrikePoint Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4 ">
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {   
            title: 'StrikePoint',
            href: dashboard(),
        },
    ],
};
