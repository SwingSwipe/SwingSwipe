import Modal from './Modal'

export default function ConfirmSheet({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
  return (
    <Modal>
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onCancel} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="font-black text-lg mb-1">{title}</h3>
        {message && <p className="text-sm text-gray-500 mb-5">{message}</p>}
        <button
          onClick={onConfirm}
          className={`w-full py-3 rounded-[12px] font-bold text-sm mb-2 ${danger ? 'bg-red-500 text-white' : 'bg-[#1D9E75] text-white'}`}
        >
          {confirmLabel}
        </button>
        <button onClick={onCancel} className="w-full py-2 text-sm text-gray-400">Cancel</button>
      </div>
    </Modal>
  )
}
