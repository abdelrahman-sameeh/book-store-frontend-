import { Dispatch, SetStateAction, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useTranslation } from "react-i18next";  // استدعاء useTranslation
import { useRecoilState } from "recoil";
import { Book } from "../../../../interfaces/interfaces";
import { ownerBookState } from "../../../../recoil/bookAtom";
import { ApiEndpoints } from "../../../../api/ApiEndpoints";
import authAxios from "../../../../api/authAxios";
import notify from "../../../utils/Notify";
import LoadingButton from "../../../utils/LoadingButton";

type DeleteBookDialogTypes = {
  showDeleteDialog: boolean;
  setShowDeleteDialog: Dispatch<SetStateAction<boolean>>;
  book?: Book;
};

function DeleteBookDialog({
  showDeleteDialog,
  setShowDeleteDialog,
  book,
}: DeleteBookDialogTypes) {
  const { t } = useTranslation();  
  const handleClose = () => setShowDeleteDialog(false);
  const [loading, setLoading] = useState(false)

  const [books, setBooks] = useRecoilState(ownerBookState)

  const handleDelete = async () => {
    setLoading(true)
    const response = await authAxios(true, ApiEndpoints.updateDeleteBook(book?._id as string), 'DELETE')
    setLoading(false)
    if(response.status===204){
      // update books state
      const filteredBooks = books.filter((bookItem: Book) => bookItem._id !== book?._id)
      setBooks(filteredBooks)

      setShowDeleteDialog(false);
      notify(t("deleteBookDialog.success"), "success"); 
    } else {
      notify(t("deleteBookDialog.error"), "error"); 
    }
  };

  return (
    <Modal
      className="custom-dialog"
      show={showDeleteDialog}
      onHide={handleClose}
    >
      <Modal.Header closeButton>
        <Modal.Title>{t('deleteBookDialog.title')}</Modal.Title>  {/* ترجمة العنوان */}
      </Modal.Header>
      <Modal.Body>{t('deleteBookDialog.confirmation')}</Modal.Body>  {/* ترجمة النص */}
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          {t('deleteBookDialog.close')}
        </Button>
        <LoadingButton loading={loading} onClick={handleDelete} variant="error">
          {t('deleteBookDialog.delete')}
        </LoadingButton>
      </Modal.Footer>
    </Modal>
  );
}

export default DeleteBookDialog;
