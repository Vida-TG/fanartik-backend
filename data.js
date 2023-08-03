import bcrypt from 'bcryptjs';

const data = {
  users: [
    {
      name: 'Basir',
      email: 'admin@example.com',
      password: bcrypt.hashSync('123456'),
      isCreator: true,
      isAdmin: true,
    },
    {
      name: 'Dani',
      email: 'dani@example.com',
      password: bcrypt.hashSync('123456'),
      isCreator: true,
      isAdmin: false,
    },
    {
      name: 'John',
      email: 'user@example.com',
      password: bcrypt.hashSync('123456'),
      isAdmin: false,
    },
  ],
  arts: [
    {
      // _id: '1',
      name: 'Nike Slim shirt',
      slug: 'nike-slim-shirt',
      category: 'Shirts',
      image: '/images/p1.jpg', // 679px × 829px
      price: 120,
      noOfPieces: 10,
      brand: 'Nike',
      description: 'high quality shirt',
    },
    {
      // _id: '2',
      name: 'Adidas Fit Shirt',
      slug: 'adidas-fit-shirt',
      category: 'Shirts',
      image: '/images/p2.jpg',
      price: 250,
      noOfPieces: 0,
      brand: 'Adidas',
      description: 'high quality art',
    },
    {
      // _id: '3',
      name: 'Nike Slim Pant',
      slug: 'nike-slim-pant',
      category: 'Pants',
      image: '/images/p3.jpg',
      price: 25,
      noOfPieces: 15,
      brand: 'Nike',
      description: 'high quality art',
    },
    {
      // _id: '4',
      name: 'Adidas Fit Pant',
      slug: 'adidas-fit-pant',
      category: 'Pants',
      image: '/images/p4.jpg',
      price: 65,
      noOfPieces: 5,
      brand: 'Puma',
      description: 'high quality art',
    },
  ],
};
export default data;
