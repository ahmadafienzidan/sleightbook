import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { doOpenFirstTrick } from "../../business/trickBusiness";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";

export const HomeRedirect = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    void doOpenFirstTrick(navigate).then((isOpened) => setIsEmpty(!isOpened));
  }, [navigate]);

  return <StatusMessage message={isEmpty ? t("app.empty") : t("app.loading")} />;
};
