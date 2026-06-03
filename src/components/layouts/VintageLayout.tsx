import React from "react";

const DEFAULT_GOLD = "#8b7355";
const DARK_BROWN = "#2c1810";
const CREAM = "#f5f0e8";
const FF = "'Playfair Display', serif";

/** Concentric circles for vintage (very low opacity, gold stroke) */
export const VintageCircles = ({ accentColor }: { accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.04 }}
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
    >
      {[80, 130, 180, 230, 280, 330].map((r) => (
        <circle key={r} cx="200" cy="300" r={r} fill="none" stroke={color} strokeWidth="0.8" />
      ))}
    </svg>
  );
};

/** Decorative ✦ divider */
export const VintageDivider = ({ accentColor }: { accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
      <span style={{ color, fontSize: "12px" }}>✦</span>
      <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
    </div>
  );
};

/** Host divider for vintage */
export const VintageHostDivider = ({ hostName, accentColor }: { hostName?: string; accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
      <span style={{ fontFamily: FF, fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color, textTransform: "uppercase", fontStyle: "italic" }}>
        hosted by {hostName || "Host"}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: color, opacity: 0.3 }} />
    </div>
  );
};

/** Vintage Location card */
export const VintageLocationCard = ({ location, accentColor }: { location: string; accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="overflow-hidden" style={{ backgroundColor: color, borderRadius: "16px" }}>
      <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
        <span style={{ fontFamily: FF, fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: CREAM, textTransform: "uppercase" }}>Location</span>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <span style={{ fontFamily: FF, fontSize: "20px", fontWeight: 900, color: DARK_BROWN }} className="block truncate">{location}</span>
        </div>
        <span style={{ fontSize: "18px", fontWeight: 300, color: DARK_BROWN, opacity: 0.4 }}>›</span>
      </div>
    </div>
  );
};

/** Vintage Date card (half width) */
export const VintageDateCard = ({ monthName, dayNum, timeStr, dayOfWeek, accentColor }: { monthName: string; dayNum: string | number; timeStr: string; dayOfWeek?: string; accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: DARK_BROWN }}>
      <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
        <span style={{ fontFamily: FF, fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color, textTransform: "uppercase" }}>{monthName}</span>
      </div>
      <div className="flex flex-col items-center py-3 px-3">
        <span style={{ fontFamily: FF, fontSize: "36px", fontWeight: 900, color: CREAM, lineHeight: 1 }}>{dayNum || "?"}</span>
        <span style={{ fontFamily: FF, fontSize: "11px", fontWeight: 600, color, opacity: 0.8, marginTop: "4px" }}>{timeStr}</span>
        {dayOfWeek && <span style={{ fontFamily: FF, fontSize: "10px", color, opacity: 0.5, marginTop: "2px" }}>{dayOfWeek}</span>}
      </div>
    </div>
  );
};

/** Vintage Dress Code card (half width) */
export const VintageDressCard = ({ dressCode, accentColor }: { dressCode: string; accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: color }}>
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
        <span style={{ fontSize: "16px" }}>🎭</span>
        <span style={{ fontFamily: FF, fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: CREAM, textTransform: "uppercase" }}>Dress Code</span>
      </div>
      <div className="flex flex-col py-3 px-3">
        <span style={{ fontFamily: FF, fontSize: "18px", fontWeight: 900, color: CREAM, lineHeight: 1.2 }}>{dressCode}</span>
      </div>
    </div>
  );
};

/** Vintage Notes card */
export const VintageNotesCard = ({ notes, accentColor }: { notes: string; accentColor?: string }) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex items-start gap-3" style={{ backgroundColor: DARK_BROWN, borderRadius: "14px", padding: "14px 16px", border: `1px solid ${color}33` }}>
      <span style={{ color, fontSize: "14px", marginTop: "1px" }}>✦</span>
      <div className="flex-1">
        <span style={{ fontFamily: FF, fontSize: "9px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.15em", display: "block" }}>
          Notes from host
        </span>
        <span className="block mt-1" style={{ fontFamily: FF, fontSize: "14px", fontStyle: "italic", color: CREAM, opacity: 0.8 }}>
          {notes}
        </span>
      </div>
    </div>
  );
};

/** Vintage attendee strip */
export const VintageAttendeeStrip = ({
  goingList,
  getInitials,
  accentColor,
}: {
  goingList: { name: string; avatar_url?: string }[];
  getInitials: (name: string) => string;
  accentColor?: string;
}) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="flex items-center justify-between mt-5 px-1">
      <span style={{ fontFamily: FF, fontSize: "9px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.15em" }}>
        {goingList.length > 0 ? `${goingList.length} going` : "No one yet"}
      </span>
      <div className="flex items-center">
        {goingList.slice(0, 5).map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: "28px", height: "28px", borderRadius: "50%", border: `2px solid ${CREAM}`, backgroundColor: DARK_BROWN, marginLeft: i > 0 ? "-8px" : 0, zIndex: 5 - i, position: "relative" }}
          >
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: "9px", fontWeight: 700, color }}>{getInitials(r.name)}</span>
            )}
          </div>
        ))}
        {goingList.length > 5 && (
          <div className="flex items-center justify-center shrink-0" style={{ width: "28px", height: "28px", borderRadius: "50%", border: `2px solid ${CREAM}`, backgroundColor: DARK_BROWN, marginLeft: "-8px", zIndex: 0, position: "relative" }}>
            <span style={{ fontSize: "8px", fontWeight: 700, color }}>+{goingList.length - 5}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/** Vintage shared sections (who's going, comments, gallery) — dark brown themed */
export const VintageSharedSections = ({
  goingList,
  maybeList,
  rsvpList,
  rsvp,
  guestListExpanded,
  setGuestListExpanded,
  comments,
  commentDraft,
  setCommentDraft,
  sendComment,
  showFullComments,
  setShowFullComments,
  photos,
  uploadingPhoto,
  photoInput,
  handlePhotoUpload,
  getInitials,
  formatTime,
  statusBadge,
  accentColor,
}: any) => {
  const color = accentColor || DEFAULT_GOLD;
  const ChevronDown = ({ className }: any) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
  );
  const ChevronUp = ({ className }: any) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
  );
  const Maximize2Icon = ({ className, style }: any) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
  );
  const SendIcon = ({ className, style }: any) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
  );

  return (
    <>
      {/* Who's going */}
      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: DARK_BROWN }}>
        <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-3">
          <h2 style={{ fontFamily: FF, fontSize: "14px", fontWeight: 700, color: CREAM }}>Who's going</h2>
          <div className="flex items-center gap-2">
            {goingList.length > 0 && <span style={{ fontFamily: FF, fontSize: "12px", fontWeight: 700, color }}>{goingList.length} going</span>}
            {guestListExpanded ? <ChevronUp className="w-4 h-4" style={{ color }} /> : <ChevronDown className="w-4 h-4" style={{ color }} />}
          </div>
        </button>
        {!guestListExpanded ? (
          <>
            <div className="flex items-center gap-2 overflow-x-auto mb-2">
              {goingList.length === 0 && <p style={{ fontFamily: FF, fontSize: "12px", color, opacity: 0.6 }}>No one yet</p>}
              {goingList.map((r: any, i: number) => (
                <div key={i} className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `2px solid ${color}`, backgroundColor: "#3d2a1a" }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: "12px", fontWeight: 700, color: CREAM }}>{getInitials(r.name)}</span>}
                  </div>
                  <span style={{ fontFamily: FF, fontSize: "10px", color, marginTop: "4px" }} className="max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
            {maybeList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                {maybeList.map((r: any, i: number) => (
                  <div key={i} className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden opacity-60" style={{ backgroundColor: "#3d2a1a" }}>
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: "10px", fontWeight: 700, color }}>{getInitials(r.name)}</span>}
                    </div>
                    <span style={{ fontFamily: FF, fontSize: "9px", color, opacity: 0.5 }} className="mt-0.5 max-w-[36px] truncate">{r.name.split(" ")[0]}</span>
                  </div>
                ))}
                <span style={{ fontFamily: FF, fontSize: "10px", fontWeight: 600, color, opacity: 0.6 }}>{maybeList.length} maybe</span>
              </div>
            )}
            {rsvp === "yes" && (
              <div className="mt-3 flex justify-center">
                <div className="rounded-full px-4 py-1.5" style={{ backgroundColor: `${DARK_BROWN}`, border: `1px solid ${color}44`, fontFamily: FF, fontSize: "12px", fontWeight: 700, color }}>
                  ✦ You're going
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rsvpList.length === 0 && <p style={{ fontFamily: FF, fontSize: "12px", color, opacity: 0.5, textAlign: "center", padding: "12px 0" }}>No RSVPs yet</p>}
            {rsvpList.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#3d2a1a" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ border: `2px solid ${color}`, backgroundColor: DARK_BROWN }}>
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: "10px", fontWeight: 700, color: CREAM }}>{getInitials(r.name)}</span>}
                </div>
                <span style={{ fontFamily: FF, fontSize: "14px", fontWeight: 600, color: CREAM, flex: 1 }}>{r.name}</span>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: DARK_BROWN }}>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: FF, fontSize: "14px", fontWeight: 700, color: CREAM }}>Chat</h2>
          <button onClick={() => setShowFullComments(true)}>
            <Maximize2Icon className="w-4 h-4" style={{ color }} />
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {comments.length === 0 && <p style={{ fontFamily: FF, fontSize: "12px", color, opacity: 0.5, textAlign: "center", padding: "12px 0" }}>No messages yet — be the first!</p>}
          {comments.map((c: any, i: number) => (
            <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#3d2a1a" }}>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: FF, fontSize: "12px", fontWeight: 700, color }}>{c.user_name}</span>
                <span style={{ fontSize: "10px", color, opacity: 0.4 }}>{formatTime(c.created_at)}</span>
              </div>
              <p style={{ fontFamily: FF, fontSize: "14px", color: CREAM, marginTop: "2px" }}>{c.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={commentDraft}
            onChange={(e: any) => setCommentDraft(e.target.value)}
            enterKeyHint="send" onKeyDown={(e: any) => e.key === "Enter" && sendComment()}
            placeholder="Write a message..."
            className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
            style={{ fontFamily: FF, backgroundColor: "#3d2a1a", color: CREAM, border: `1px solid ${color}33` }}
          />
          <button type="button" onClick={sendComment} onTouchEnd={(e) => { e.preventDefault(); sendComment(); }} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
            <SendIcon className="w-4 h-4" style={{ color: CREAM }} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: DARK_BROWN }}>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: FF, fontSize: "14px", fontWeight: 700, color: CREAM }}>Gallery</h2>
          <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ fontFamily: FF, backgroundColor: color, color: CREAM }}>
            Add photo
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        {uploadingPhoto && <p style={{ fontFamily: FF, fontSize: "12px", color, textAlign: "center", padding: "8px 0" }}>Uploading...</p>}
        {photos.length === 0 && !uploadingPhoto ? (
          <p style={{ fontFamily: FF, fontSize: "12px", color, opacity: 0.5, textAlign: "center", padding: "16px 0" }}>No photos yet — add the first one!</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p: any) => (
              <div key={p.id} className="aspect-square rounded-xl overflow-hidden">
                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/** RSVP bar for Vintage */
export const VintageRsvpBar = ({
  rsvp,
  barMinimised,
  setBarMinimised,
  handleRsvp,
  rsvpLabel,
  accentColor,
}: {
  rsvp: string | null;
  barMinimised: boolean;
  setBarMinimised: (v: boolean) => void;
  handleRsvp: (v: string) => void;
  rsvpLabel: string;
  accentColor?: string;
}) => {
  const color = accentColor || DEFAULT_GOLD;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      {barMinimised && rsvp ? (
        <button
          onClick={() => setBarMinimised(false)}
          className="mx-auto block backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold"
          style={{ fontFamily: FF, backgroundColor: DARK_BROWN, color, border: `1px solid ${color}44` }}
        >
          {rsvp === "yes" ? "✦ You're going" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷"}
        </button>
      ) : (
        <div className="backdrop-blur-sm rounded-2xl p-4" style={{ backgroundColor: DARK_BROWN, border: `1px solid ${color}33` }}>
          <p style={{ fontFamily: FF, fontSize: "12px", fontWeight: 600, color, textAlign: "center", marginBottom: "12px" }}>
            {rsvp ? rsvpLabel : "Are you going?"}
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleRsvp("yes")} className="flex-1 rounded-full py-2.5 text-sm font-bold" style={{ fontFamily: FF, backgroundColor: rsvp === "yes" ? color : "#3d2a1a", color: rsvp === "yes" ? CREAM : color, border: `1px solid ${color}44` }}>Yes 🙌</button>
            <button onClick={() => handleRsvp("no")} className="flex-1 rounded-full py-2.5 text-sm font-bold" style={{ fontFamily: FF, backgroundColor: rsvp === "no" ? color : "#3d2a1a", color: rsvp === "no" ? CREAM : color, border: `1px solid ${color}44` }}>No 👎</button>
            <button onClick={() => handleRsvp("maybe")} className="flex-1 rounded-full py-2.5 text-sm font-bold" style={{ fontFamily: FF, backgroundColor: rsvp === "maybe" ? color : "#3d2a1a", color: rsvp === "maybe" ? CREAM : color, border: `1px solid ${color}44` }}>Maybe 🤷</button>
          </div>
        </div>
      )}
    </div>
  );
};
