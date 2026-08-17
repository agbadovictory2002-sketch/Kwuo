export function rowToCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function rowToTxn(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    amount: Number(row.amount),
    note: row.note || "",
    date: row.date ? new Date(row.date).getTime() : Date.now(),
    loggedBy: row.logged_by_name || "",
    editedBy: row.edited_by_name || "",
    deleted: !!row.deleted,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
    deletedBy: row.deleted_by_name || "",
  };
}
