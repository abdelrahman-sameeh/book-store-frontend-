import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import LoadingButton from "../../../utils/LoadingButton";
import { useRecoilState } from "recoil";
import { cartsState, targetCartState } from "../../../../recoil/cartsAtom";
import authAxios from "../../../../api/authAxios";
import { ApiEndpoints } from "../../../../api/ApiEndpoints";
import { addressesState } from "../../../../recoil/addressesAtom";
import CreateUpdateAddressModal from "../address/CreateUpdateAddressModal";
import notify from "../../../utils/Notify";

type CompProps = { show: boolean; setShow: Dispatch<SetStateAction<boolean>> };

const CreateOrderDialog = ({ show, setShow }: CompProps) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [cart, setCart] = useRecoilState(targetCartState);
  const [addresses, setAddresses] = useRecoilState(addressesState);
  const [carts, setCarts] = useRecoilState(cartsState);
  const [showCreateAddressDialog, setShowCreateAddressDialog] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [hasOfflineBook, setHasOfflineBook] = useState(true);
  const [invalidBooks, setInvalidBooks] = useState<any>([]);

  useEffect(() => {
    const hasOfflineBook = cart?.books?.some(
      (item) => item.book.status === "offline"
    );
    setHasOfflineBook(
      (hasOfflineBook as boolean) || paymentMethod === "offline"
    );
  }, [cart, paymentMethod]);

  useEffect(() => {
    authAxios(true, ApiEndpoints.listCreateAddresses).then((response) => {
      setAddresses(response?.data?.data?.addresses);
    });
  }, []);

  const handleClose = () => {
    setShow(false);
    setCart({});
    setErrors({});
    setInvalidBooks([]);
  };


  const handleUpdateCart = async () => {
    for (const bookItem of invalidBooks) {
      if (bookItem?.count > bookItem?.book?.count) {
        const response = await authAxios(
          true,
          ApiEndpoints.deleteBookFromCart(bookItem?.book._id as string),
          "DELETE",
          {
            count: bookItem.count - bookItem?.book?.count,
            cartId: cart._id,
          }
        );
  
        if (response.status === 200) {
          const updateCarts = carts.map((c) =>
            c._id === cart._id ? response?.data?.data?.cart : c
          );
          setCarts(updateCarts);
        } else if (response.status === 204) {
          setCarts((prev) => prev.filter((c) => c._id !== cart._id));
        }
      }
    }
  
    setInvalidBooks([]);
    notify(t("createOrderDialog.notify.completeOrderAgain"));
  };
  
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (hasOfflineBook && !selectedAddress) {
      setErrors((prev) => ({ ...prev, selectedAddress: true }));
      return;
    }
    if (!cart) {
      handleClose();
    }
  
    const data: {
      paymentType: string;
      cartId: string;
      addressId?: string;
    } = {
      paymentType: paymentMethod,
      cartId: cart._id as string,
    };
  
    if (hasOfflineBook) {
      data.addressId = selectedAddress;
    }
  
    setLoading(true);
    const response = await authAxios(
      true,
      ApiEndpoints.completeOrder,
      "POST",
      data
    );
    setLoading(false);
  
    if (response.status === 201) {
      notify(t("createOrderDialog.notify.orderCreatedSuccess"), "success");
      setShowCreateAddressDialog(false);
      setCarts((prev) => prev.filter((c) => c._id !== cart._id));
      setCart({});
    } else if (response.status === 200) {
      notify(t("createOrderDialog.notify.redirectToPaymentPage"), "success", 2000);
      setTimeout(() => {
        window.location.href = response?.data?.url;
      }, 2000);
    } else if (response?.data?.message == "these books not available") {
      notify(
        t("createOrderDialog.notify.booksNotAvailable"),
        "error",
        6000
      );
      setInvalidBooks(response?.data?.books);
    } else {
      notify(t("createOrderDialog.notify.somethingWentWrong"), "error");
    }
  };
  

  return (
    <>
      <Modal
        className="custom-dialog"
        show={show}
        onHide={handleClose}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("createOrderDialog.title")}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Payment Method Radio Buttons */}
            <Form.Group>
              <Form.Label>{t("createOrderDialog.paymentMethod")}</Form.Label>
              <div>
                <Form.Check
                  className="d-flex justify-content-start align-items-center gap-1"
                  type="radio"
                  id="onlinePayment"
                  label={t("createOrderDialog.onlinePayment")}
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === "online"}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                  }}
                />
                <Form.Check
                  className="d-flex justify-content-start align-items-center gap-1"
                  type="radio"
                  id="offlinePayment"
                  label={t("createOrderDialog.offlinePayment")}
                  name="paymentMethod"
                  value="offline"
                  checked={paymentMethod === "offline"}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                  }}
                />
              </div>
            </Form.Group>

            {hasOfflineBook ? (
              <>
                <Form.Group className="mt-2" controlId="selectAddress">
                  <Form.Label>
                    {t("createOrderDialog.selectAddress")}
                  </Form.Label>
                  <Form.Select
                    onChange={(e) => {
                      delete errors["selectedAddress"];
                      setSelectedAddress(e.target.value);
                    }}
                    value={selectedAddress}
                    aria-label={t("createOrderDialog.selectAddressPlaceholder")}
                    isInvalid={errors.selectedAddress as boolean}
                  >
                    <option value="">
                      {t("createOrderDialog.selectAddressPlaceholder")}
                    </option>
                    {addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {`${address.city}, ${address.address}`}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback
                    type="invalid"
                    className="fw-bold text-danger"
                  >
                    {t("createOrderDialog.selectAddressRequired")}
                  </Form.Control.Feedback>
                </Form.Group>

                <LoadingButton
                  onClick={() => {
                    setShowCreateAddressDialog(true);
                  }}
                  title={t("createOrderDialog.addNewAddress")}
                  className="w-fit mt-1"
                >
                  {t('createOrderDialog.addNewAddress')}
                </LoadingButton>
              </>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <LoadingButton type={"submit"} loading={loading}>
              {t("createOrderDialog.create")}
            </LoadingButton>
            <Button variant="secondary" onClick={handleClose}>
              {t("createOrderDialog.close")}
            </Button>
          </Modal.Footer>
        </Form>
        {invalidBooks.length ? (
          <>
            <LoadingButton onClick={handleUpdateCart}>
              update cart
            </LoadingButton>
          </>
        ) : null}
      </Modal>

      <CreateUpdateAddressModal
        show={showCreateAddressDialog}
        setShow={setShowCreateAddressDialog}
      />
    </>
  );
};

export default CreateOrderDialog;
