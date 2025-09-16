// components/Notifications/Notification.tsx
import { motion, AnimatePresence } from "framer-motion";

interface NotificationProps {
    id: number;
    message: string;
    type?: "success" | "error" | "info";
    onClose: (id: number) => void;
}

export const Notification = ({
    id,
    message,
    type = "info",
    onClose,
}: NotificationProps) => {
    const colors = {
        success: "bg-green-600/80",
        error: "bg-red-600/80",
        info: "bg-blue-600/80",
    };

    return (
        <motion.div
            key={id}
            initial={{ opacity: 0, x: 50, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50, y: -20 }}
            transition={{ duration: 0.25 }}
            className={`${colors[type]} backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-lg`}
        >
            <div className="flex justify-between items-center space-x-3">
                <span className="text-sm font-medium">{message}</span>
                <button
                    onClick={() => onClose(id)}
                    className="text-white font-bold hover:text-gray-200"
                >
                    ×
                </button>
            </div>
        </motion.div>
    );
};

interface NotificationListProps {
    notifications: {
        id: number;
        message: string;
        type?: "success" | "error" | "info";
    }[];
    onClose: (id: number) => void;
}

export const NotificationList = ({
    notifications,
    onClose,
}: NotificationListProps) => {
    return (
        <div className="fixed top-5 right-5 z-50 w-80">
            <AnimatePresence>
                {notifications.map((n, index) => {
                    const reverseIndex = notifications.length - 1 - index; // reverse order
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 50, y: -20 }}
                            animate={{
                                opacity: 1,
                                x: 0,
                                y: reverseIndex * 10,       // newest stays at top (y=0)
                                scale: 1 - reverseIndex * 0.03,
                            }}
                            exit={{ opacity: 0, x: 50, y: -20 }}
                            transition={{ duration: 0.25 }}
                            className="absolute top-0 right-0 w-full"
                            style={{ zIndex: 1000 + index }} // ensure newer overlays older
                        >
                            <Notification {...n} onClose={onClose} />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

