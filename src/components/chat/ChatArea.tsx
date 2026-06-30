'use client';

import './ChatArea.css';
import ChatCallPopup from './ChatCallPopup';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInputFooter from './ChatInputFooter';
import ChatModals from './ChatModals'; 
import { useChat } from '@/components/chat/hooks/useChat';

export default function ChatArea() {
  const { state, actions, refs } = useChat();

  return (
    <div className="telegram-chat hype-chat-scope">
      <ChatCallPopup 
        callStatus={state.callStatus} 
        callData={state.callData} 
        refs={refs} 
        connectLiveKit={actions.connectLiveKit} 
        endCall={actions.endCall} 
        currentUser={state.currentUser} 
      />

      <ChatHeader 
        router={state.router} 
        targetId={state.targetId} 
        headerInfo={state.headerInfo} 
        displayStatus={state.displayStatus} 
        chatState={state.chatState} 
        roomId={state.roomId}
        groupId={state.groupId} 
        isOwner={state.isOwner} 
        setGroupModalTab={actions.setGroupModalTab} 
        setIsGroupSettingsOpen={actions.setIsGroupSettingsOpen} 
        startCall={actions.startCall}
        isSelectionMode={state.isSelectionMode} 
        setIsSelectionMode={actions.setIsSelectionMode}
        selectAllMessages={actions.selectAllMessages} 
        handleBulkDelete={actions.handleBulkDelete}
        selectedMessages={state.selectedMessages}
      />

      <ChatMessageList 
        isLoading={state.isLoading} 
        t={state.t} 
        messages={state.messages} 
        currentUser={state.currentUser} 
        setReplyTo={actions.setReplyTo} 
        setMsgOptions={actions.setMsgOptions} 
        typingUser={state.typingUser} 
        refs={refs}
        onEdit={actions.handleEditMessage}
        onDelete={actions.handleDeleteMessage}
        router={state.router}
        isSelectionMode={state.isSelectionMode}
        selectedMessages={state.selectedMessages}
        toggleSelectMessage={actions.toggleSelectMessage}
        setIsSelectionMode={actions.setIsSelectionMode} 
        isGroupOrGlobal={!!state.groupId || state.roomId === 'room-1'}
      />

      <ChatInputFooter 
        chatState={state.chatState} 
        headerInfo={state.headerInfo} 
        handleTolakRequest={actions.handleTolakRequest} 
        handleTerimaRequest={actions.handleTerimaRequest} 
        isStickerOpen={state.isStickerOpen} 
        setIsStickerOpen={actions.setIsStickerOpen} 
        fetchStickers={actions.fetchStickers} 
        t={state.t} 
        stickers={state.stickers} 
        sendMessage={actions.sendMessage} 
        replyTo={state.replyTo} 
        setReplyTo={actions.setReplyTo} 
        isRecording={state.isRecording} 
        recordTime={state.recordTime} 
        audioLevel={state.audioLevel} 
        inputValue={state.inputValue} 
        handleTyping={actions.handleTyping} 
        handlePhotoClick={actions.handlePhotoClick} 
        isUploadingImg={state.isUploadingImg} 
        canSend={state.canSend} 
        handleMicTouchStart={actions.handleMicTouchStart} 
        stopVN={actions.stopVN} 
        handleMicTouchMove={actions.handleMicTouchMove} 
        handleSendClick={actions.handleSendClick} 
        editMessageId={state.editMessageId}
      />

      <ChatModals 
        isImageModalOpen={state.isImageModalOpen}
        onCloseImageModal={() => actions.setIsImageModalOpen(false)}
        onSendImage={actions.handleSendImageFromModal}
        isUploadingImg={state.isUploadingImg}
        isGroupSettingsOpen={state.isGroupSettingsOpen}
        setIsGroupSettingsOpen={actions.setIsGroupSettingsOpen}
        groupModalTab={state.groupModalTab}
        inviteSearch={state.inviteSearch}
        setInviteSearch={actions.setInviteSearch}
        handleAddMember={actions.handleAddMember}
        isUpdatingGroup={state.isUpdatingGroup}
        groupMembers={state.groupMembers}
        currentUser={state.currentUser}
        headerInfo={state.headerInfo}
        handleGroupPhotoUpload={actions.handleGroupPhotoUpload}
        newGroupName={state.newGroupName}
        setNewGroupName={actions.setNewGroupName}
        updateGroupInfo={actions.updateGroupInfo}
        isOwner={state.isOwner}
        kickMember={actions.kickMember}
      />
    </div>
  );
}
