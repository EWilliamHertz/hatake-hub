import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType = 'trade_offer' | 'comment' | 'like' | 'message' | 'sale';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserPhoto?: string;
}

/**
 * Creates a notification for a user
 */
export const createNotification = async (params: CreateNotificationParams) => {
  const { userId, ...notificationData } = params;
  
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsRef, {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp(),
    });
    console.log('Notification created for user:', userId);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Send a trade offer notification
 */
export const notifyTradeOffer = async (
  toUserId: string,
  fromUser: { uid: string; displayName: string; photoURL?: string },
  cardName: string
) => {
  await createNotification({
    userId: toUserId,
    type: 'trade_offer',
    title: 'New Trade Offer',
    body: `${fromUser.displayName} wants to trade for your ${cardName}`,
    link: '/trades',
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    fromUserPhoto: fromUser.photoURL,
  });
};

/**
 * Send a comment notification
 */
export const notifyComment = async (
  toUserId: string,
  fromUser: { uid: string; displayName: string; photoURL?: string },
  postId: string
) => {
  await createNotification({
    userId: toUserId,
    type: 'comment',
    title: 'New Comment',
    body: `${fromUser.displayName} commented on your post`,
    link: `/feed#${postId}`,
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    fromUserPhoto: fromUser.photoURL,
  });
};

/**
 * Send a like notification
 */
export const notifyLike = async (
  toUserId: string,
  fromUser: { uid: string; displayName: string; photoURL?: string },
  postId: string
) => {
  await createNotification({
    userId: toUserId,
    type: 'like',
    title: 'New Like',
    body: `${fromUser.displayName} liked your post`,
    link: `/feed#${postId}`,
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    fromUserPhoto: fromUser.photoURL,
  });
};

/**
 * Send a message notification
 */
export const notifyMessage = async (
  toUserId: string,
  fromUser: { uid: string; displayName: string; photoURL?: string }
) => {
  await createNotification({
    userId: toUserId,
    type: 'message',
    title: 'New Message',
    body: `${fromUser.displayName} sent you a message`,
    link: '/messenger',
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    fromUserPhoto: fromUser.photoURL,
  });
};

/**
 * Send a sale notification
 */
export const notifySale = async (
  toUserId: string,
  buyerName: string,
  cardName: string,
  price: number
) => {
  await createNotification({
    userId: toUserId,
    type: 'sale',
    title: 'Card Sold!',
    body: `${buyerName} purchased your ${cardName} for $${price.toFixed(2)}`,
    link: '/trades',
  });
};
