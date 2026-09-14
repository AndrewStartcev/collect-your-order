import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  { id: 'milk', name: 'Молоко', shortName: 'Молоко', category: 'dairy', icon: '🥛', color: 0x4f83cc },
  { id: 'kefir', name: 'Кефир', shortName: 'Кефир', category: 'dairy', icon: '🥛', color: 0x5c8fd3 },
  { id: 'yogurt', name: 'Йогурт', shortName: 'Йогурт', category: 'dairy', icon: '🥣', color: 0x7aa7e8 },
  { id: 'cheese', name: 'Сыр', shortName: 'Сыр', category: 'dairy', icon: '🧀', color: 0xe2b93b },
  { id: 'butter', name: 'Масло', shortName: 'Масло', category: 'dairy', icon: '🧈', color: 0xe9c96d },
  { id: 'cottage', name: 'Творог', shortName: 'Творог', category: 'dairy', icon: '🥣', color: 0x91b8e8 },

  { id: 'banana', name: 'Бананы', shortName: 'Бананы', category: 'produce', icon: '🍌', color: 0xe8c72d },
  { id: 'apple', name: 'Яблоки', shortName: 'Яблоки', category: 'produce', icon: '🍎', color: 0xcb4b48 },
  { id: 'orange', name: 'Апельсины', shortName: 'Апельсин', category: 'produce', icon: '🍊', color: 0xe88832 },
  { id: 'tomato', name: 'Помидоры', shortName: 'Томаты', category: 'produce', icon: '🍅', color: 0xc94b43 },
  { id: 'cucumber', name: 'Огурцы', shortName: 'Огурцы', category: 'produce', icon: '🥒', color: 0x58a45e },
  { id: 'carrot', name: 'Морковь', shortName: 'Морковь', category: 'produce', icon: '🥕', color: 0xe27c2f },

  { id: 'rice', name: 'Рис', shortName: 'Рис', category: 'grocery', icon: '🍚', color: 0xc5a56a },
  { id: 'pasta', name: 'Макароны', shortName: 'Макароны', category: 'grocery', icon: '🍝', color: 0xd89d43 },
  { id: 'buckwheat', name: 'Гречка', shortName: 'Гречка', category: 'grocery', icon: '🌾', color: 0xa87843 },
  { id: 'flour', name: 'Мука', shortName: 'Мука', category: 'grocery', icon: '🌾', color: 0xc6ad86 },
  { id: 'sugar', name: 'Сахар', shortName: 'Сахар', category: 'grocery', icon: '🧂', color: 0xd9d4c6 },
  { id: 'tea', name: 'Чай', shortName: 'Чай', category: 'grocery', icon: '🫖', color: 0x88724b },

  { id: 'paper', name: 'Туалетная бумага', shortName: 'Бумага', category: 'household', icon: '🧻', color: 0xc6d7ed },
  { id: 'soap', name: 'Мыло', shortName: 'Мыло', category: 'household', icon: '🧼', color: 0x69b8c0 },
  { id: 'shampoo', name: 'Шампунь', shortName: 'Шампунь', category: 'household', icon: '🧴', color: 0x8f71c7 },
  { id: 'detergent', name: 'Средство для посуды', shortName: 'Для посуды', category: 'household', icon: '🧴', color: 0x58a7a0 },
  { id: 'powder', name: 'Стиральный порошок', shortName: 'Порошок', category: 'household', icon: '🧺', color: 0x5b7dbd },
  { id: 'sponges', name: 'Губки', shortName: 'Губки', category: 'household', icon: '🧽', color: 0xe0b33e },
  { id: 'batteries', name: 'Батарейки', shortName: 'Батарейки', category: 'household', icon: '🔋', color: 0x4f6f92 },

  { id: 'dumplings', name: 'Пельмени', shortName: 'Пельмени', category: 'frozen', icon: '🥟', color: 0x5f83b9 },
  { id: 'berries', name: 'Ягоды замороженные', shortName: 'Ягоды', category: 'frozen', icon: '🫐', color: 0x72579f },
  { id: 'icecream', name: 'Мороженое', shortName: 'Мороженое', category: 'frozen', icon: '🍦', color: 0xd47ea8 },
  { id: 'vegetables_frozen', name: 'Овощная смесь', shortName: 'Овощи', category: 'frozen', icon: '🥦', color: 0x4f965b },
  { id: 'pizza', name: 'Пицца', shortName: 'Пицца', category: 'frozen', icon: '🍕', color: 0xb85a3f },
  { id: 'cutlets', name: 'Котлеты', shortName: 'Котлеты', category: 'frozen', icon: '🥩', color: 0x9a5a47 },

  { id: 'chocolate', name: 'Шоколад', shortName: 'Шоколад', category: 'snacks', icon: '🍫', color: 0x7e5438 },
  { id: 'cookies', name: 'Печенье', shortName: 'Печенье', category: 'snacks', icon: '🍪', color: 0xc38a4a },
  { id: 'chips', name: 'Чипсы', shortName: 'Чипсы', category: 'snacks', icon: '🥔', color: 0xd47738 },
  { id: 'crackers', name: 'Крекеры', shortName: 'Крекеры', category: 'snacks', icon: '🥨', color: 0xb9884c },
  { id: 'nuts', name: 'Орехи', shortName: 'Орехи', category: 'snacks', icon: '🥜', color: 0xa27042 },
  { id: 'candy', name: 'Конфеты', shortName: 'Конфеты', category: 'snacks', icon: '🍬', color: 0xcb668f },
];

export const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));
