import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Bell,
  BellOff
} from 'lucide-react';
import { logger } from '../utils/logger';
import type { Notification } from '../types/logs';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = logger.onNotificationsChange(setNotifications);
    return unsubscribe;
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const removeNotification = (id: string) => {
    logger.removeNotification(id);
  };

  const clearAllNotifications = () => {
    notifications.forEach(notification => {
      logger.removeNotification(notification.id);
    });
  };

  const unreadCount = notifications.length;

  return (
    <>
      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-white border rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
        >
          {unreadCount > 0 ? (
            <Bell className="h-5 w-5 text-gray-700" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 w-80 max-h-96 bg-white border rounded-lg shadow-xl z-40 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 ${getNotificationColor(notification.type)} hover:bg-opacity-75 transition-colors`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 left-4 space-y-2 z-50">
        {notifications.slice(0, 3).map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center space-x-3 p-3 rounded-lg shadow-lg border ${getNotificationColor(notification.type)} animate-slide-in-left`}
          >
            {getNotificationIcon(notification.type)}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <p className="text-sm text-gray-600">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}