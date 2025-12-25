export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 mt-auto print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex justify-center md:justify-start">
                        <p className="text-sm text-gray-500">
                            &copy; 2025 Event Manager, Developed by Adhri Communication. All rights reserved.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex justify-center md:justify-end space-x-6">
                        <span className="text-sm text-gray-400">
                            v1.0.0
                        </span>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                            Support
                        </a>
                        <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                            Privacy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
