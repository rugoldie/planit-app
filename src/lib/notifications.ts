import { supabase } from "@/integrations/supabase/client";

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    await (supabase as any).from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data,
      read: false,
    });
  } catch (e) {
    console.warn("createNotification failed:", e);
  }
};
