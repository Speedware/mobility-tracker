export const COMMENT_MAX = 300;

export const REPAIR_PARTS = [
  { id: 'brakes', label: 'Тормоза' },
  { id: 'lights', label: 'Освещение' },
  { id: 'battery', label: 'Батарея' },
  { id: 'throttle', label: 'Ручка газа' },
  { id: 'mirrors', label: 'Зеркала' },
  { id: 'other', label: 'Другое' },
];
export const partLabel = id => REPAIR_PARTS.find(p => p.id === id)?.label || id;
export const partTags = parts => parts.map(p => `<span class="tag tag-repair">${partLabel(p)}</span>`).join('');

export const BIKE_AVAILABILITY = { available: 'Доступен', unavailable: 'Недоступен', hidden: 'Скрыт' };

export const PAY_STATUSES = { pending: 'Ждёт оплаты', paid: 'Оплачено', rejected: 'Отклонено' };
const PAY_TAG_CLASS = { pending: 'tag-wait', paid: 'tag-free', rejected: 'tag-rejected' };

export const counted = r => r.endedAt && r.payStatus !== 'rejected';

export const payTag = r => (!r.endedAt ? '<span class="tag tag-busy">идёт</span>'
  : r.closedByBlock ? '<span class="tag tag-repair">Закрыта блокировкой</span>'
  : `<span class="tag ${PAY_TAG_CLASS[r.payStatus]}">${PAY_STATUSES[r.payStatus]}</span>`);
