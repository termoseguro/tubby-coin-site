-- A nonce belongs to NOBODY until it is used.
--
-- wallet_nonces.player_id was NOT NULL, which assumed the nonce is issued to a
-- player who is already known. That is backwards: the whole point of the nonce
-- is to establish who the wallet belongs to, and on a first sign-in there is no
-- player row yet. Issuing one would mean creating an account for anybody who
-- can POST an address — a free account-creation faucet, before any proof.
alter table wallet_nonces alter column player_id drop not null;

-- The lookup the verify route makes, on every sign-in.
create index if not exists wallet_nonces_addr_idx on wallet_nonces (address, used_at);
