import { Head } from '@inertiajs/react';

export default function WriteOption() {
    return (
        <>
            <Head title="Write an Option" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4" />
        </>
    );
}

WriteOption.layout = {
    breadcrumbs: [
        {
            title: 'Write an Option',
            href: '/write-option',
        },
    ],
};


