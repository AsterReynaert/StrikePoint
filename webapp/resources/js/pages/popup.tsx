
export default function Popup({
  title,
  message,
  buttonText,
  onAction,
  titleColor = "text-red-600",
}: {
  title: string;
  message: string;
  buttonText?: string;
  onAction?: () => void;
  titleColor?: string;
}) {
  return (
    <div
      id="popup"
      tabIndex={-1}
      className="overflow-y-auto overflow-x-hidden top-0 right-0 left-0 z-50 w-full md:inset-0 h-modal md:h-full flex justify-center items-center fixed inset-0 backdrop-blur-sm"
    >
      <div className="relative p-4 w-full max-w-lg h-full md:h-auto">
        <div className="relative p-4 bg-white rounded-lg shadow dark:bg-gray-800 md:p-8">
          <div className="mb-4 text-sm font-light text-gray-500 dark:text-gray-400">
            <h3 className={`mb-3 text-2xl font-bold ${titleColor}`}>{title}</h3>
            <p>{message}</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={onAction}
              >
                {buttonText}
              </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}