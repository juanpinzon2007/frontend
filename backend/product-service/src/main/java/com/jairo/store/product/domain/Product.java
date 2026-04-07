package com.jairo.store.product.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Table("products")
public class Product {

    @Id
    private UUID id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer availableStock;

    public Product() {
    }

    public Product(UUID id, String name, String description, BigDecimal price, Integer availableStock) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.availableStock = availableStock;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getAvailableStock() {
        return availableStock;
    }

    public void setAvailableStock(Integer availableStock) {
        this.availableStock = availableStock;
    }
}
