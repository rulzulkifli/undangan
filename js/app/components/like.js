// js/app/components/like.js

import { dto } from "../../connection/dto.js";
import { storage } from "../../common/storage.js";
import { session } from "../../common/session.js";
import { tapTapAnimation } from "../../libs/confetti.js";
// [PERBAIKAN] Tambahkan HTTP_STATUS_OK ke dalam import
import {
  request,
  HTTP_PATCH,
  HTTP_POST,
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from "../../connection/request.js";

export const like = (() => {
  /**
   * @type {ReturnType<typeof storage>|null}
   */
  let likes = null;

  /**
   * @type {Map<string, AbortController>|null}
   */
  let listeners = null;

  /**
   * @param {HTMLButtonElement} button
   * @returns {Promise<void>}
   */
  const love = async (button) => {
    const info = button.firstElementChild;
    const heart = button.lastElementChild;

    const id = button.getAttribute("data-uuid");
    const count = parseInt(info.getAttribute("data-count-like"));

    button.disabled = true;

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    if (likes.has(id)) {
      await request(HTTP_PATCH, "/api/comment/" + likes.get(id))
        .token(session.getToken())
        .send(dto.statusResponse)
        .then((res) => {
          if (res.data.status) {
            likes.unset(id);

            heart.classList.remove("fa-solid", "text-danger");
            heart.classList.add("fa-regular");

            info.setAttribute("data-count-like", String(count - 1));
          }
        })
        .finally(() => {
          info.innerText = info.getAttribute("data-count-like");
          button.disabled = false;
        });
    } else {
      await request(HTTP_POST, "/api/comment/" + id)
        .token(session.getToken())
        .send(dto.uuidResponse)
        .then((res) => {
          // Karena backend sekarang selalu kirim 201 untuk request baru
          if (res.code === HTTP_STATUS_CREATED) {
            likes.set(id, res.data.uuid); // Simpan kunci unik untuk browser ini

            heart.classList.remove("fa-regular");
            heart.classList.add("fa-solid", "text-danger");

            // Angka like akan selalu bertambah di browser ini
            info.setAttribute("data-count-like", String(count + 1));
          }
        })
        .finally(() => {
          info.innerText = info.getAttribute("data-count-like");
          button.disabled = false;
        });
    }
  };

  /**
   * @param {string} uuid
   * @returns {HTMLElement|null}
   */
  const getButtonLike = (uuid) => {
    return document.querySelector(
      `button[onclick="undangan.comment.like.love(this)"][data-uuid="${uuid}"]`
    );
  };

  /**
   * @param {HTMLElement} div
   * @returns {Promise<void>}
   */
  const tapTap = async (div) => {
    if (!navigator.onLine) {
      return;
    }

    const currentTime = Date.now();
    const tapLength = currentTime - parseInt(div.getAttribute("data-tapTime"));
    const uuid = div.id.replace("body-content-", "");

    const isTapTap = tapLength < 300 && tapLength > 0;
    const notLiked =
      !likes.has(uuid) && div.getAttribute("data-liked") !== "true";

    if (isTapTap && notLiked) {
      tapTapAnimation(div);

      div.setAttribute("data-liked", "true");
      await love(getButtonLike(uuid));
      div.setAttribute("data-liked", "false");
    }

    div.setAttribute("data-tapTime", String(currentTime));
  };

  /**
   * @param {string} uuid
   * @returns {void}
   */
  const addListener = (uuid) => {
    const ac = new AbortController();

    const bodyLike = document.getElementById(`body-content-${uuid}`);
    bodyLike.addEventListener("touchend", () => tapTap(bodyLike), {
      signal: ac.signal,
    });

    bodyLike.addEventListener(
      "dblclick",
      () => {
        const notLiked =
          !likes.has(uuid) && bodyLike.getAttribute("data-liked") !== "true";
        if (notLiked) {
          tapTapAnimation(bodyLike);
          love(getButtonLike(uuid));
        }
      },
      {
        signal: ac.signal,
      }
    );

    listeners.set(uuid, ac);
  };

  /**
   * @param {string} uuid
   * @returns {void}
   */
  const removeListener = (uuid) => {
    const ac = listeners.get(uuid);
    if (ac) {
      ac.abort();
      listeners.delete(uuid);
    }
  };

  /**
   * @returns {void}
   */
  const init = () => {
    listeners = new Map();
    likes = storage("likes");
  };

  return {
    init,
    love,
    getButtonLike,
    addListener,
    removeListener,
  };
})();
